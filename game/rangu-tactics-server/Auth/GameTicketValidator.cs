using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

namespace Rangu.Tactics.Server.Auth;

public sealed class GameTicketOptions
{
    /// <summary>예: https://rangu.fam/api/game/jwks</summary>
    public required string JwksUrl { get; init; }
    public string Issuer { get; init; } = "https://rangu.fam";
    public string Audience { get; init; } = "rangu-tactics";
    public TimeSpan RefreshInterval { get; init; } = TimeSpan.FromMinutes(15);
    public TimeSpan ClockSkew { get; init; } = TimeSpan.FromSeconds(5);
}

public sealed record GameTicketPrincipal(string UserId, string Username, string? MatchId, string Jti);

public sealed class GameTicketValidationException(string reason) : Exception(reason)
{
    public string Reason { get; } = reason;
}

/// <summary>
/// rangu.fam 이 RS256 으로 발급한 단명 game ticket 을 rangu.fam JWKS 로 stateless 검증한다.
/// 검증: 서명(JWKS kid 매칭) + iss + aud + exp/nbf + (선택) jti 재사용 방지.
/// JWKS 는 메모리 캐시 후 주기 갱신, kid 미스 시 1회 강제 갱신 후 재시도.
/// </summary>
public sealed class GameTicketValidator(HttpClient http, GameTicketOptions options, IMemoryCache jtiCache)
{
    private readonly JwtSecurityTokenHandler _handler = new() { MapInboundClaims = false };
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private IList<SecurityKey> _keys = new List<SecurityKey>();
    private DateTimeOffset _keysFetchedAt = DateTimeOffset.MinValue;

    public async Task<GameTicketPrincipal> ValidateAsync(string ticket, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ticket))
            throw new GameTicketValidationException("empty_ticket");

        await EnsureKeysAsync(force: false, ct);

        ClaimsPrincipal principal;
        try
        {
            principal = Validate(ticket);
        }
        catch (SecurityTokenSignatureKeyNotFoundException)
        {
            // 키 회전 가능성 → 1회 강제 refresh 후 재시도.
            await EnsureKeysAsync(force: true, ct);
            principal = Validate(ticket);
        }
        catch (SecurityTokenException ex)
        {
            throw new GameTicketValidationException($"invalid_ticket:{ex.GetType().Name}");
        }

        var userId = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                     ?? throw new GameTicketValidationException("missing_sub");
        var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                  ?? throw new GameTicketValidationException("missing_jti");
        var username = principal.FindFirst("username")?.Value ?? string.Empty;
        var matchId = principal.FindFirst("match_id")?.Value;

        // 단일 사용(replay 방지): 이미 본 jti 면 거부. exp(=60s) 범위만 캐시하면 충분.
        if (jtiCache.TryGetValue(jti, out _))
            throw new GameTicketValidationException("ticket_replayed");
        jtiCache.Set(jti, true, TimeSpan.FromSeconds(90));

        return new GameTicketPrincipal(userId, username, matchId, jti);
    }

    private ClaimsPrincipal Validate(string ticket)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = options.Issuer,
            ValidateAudience = true,
            ValidAudience = options.Audience,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ClockSkew = options.ClockSkew,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = _keys,
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256], // RS256 외 알고리즘 거부(alg confusion 방지)
        };
        return _handler.ValidateToken(ticket, parameters, out _);
    }

    private async Task EnsureKeysAsync(bool force, CancellationToken ct)
    {
        var fresh = _keys.Count > 0 && DateTimeOffset.UtcNow - _keysFetchedAt < options.RefreshInterval;
        if (!force && fresh) return;

        await _refreshLock.WaitAsync(ct);
        try
        {
            fresh = _keys.Count > 0 && DateTimeOffset.UtcNow - _keysFetchedAt < options.RefreshInterval;
            if (!force && fresh) return;

            var json = await http.GetStringAsync(options.JwksUrl, ct);
            _keys = new JsonWebKeySet(json).GetSigningKeys();
            _keysFetchedAt = DateTimeOffset.UtcNow;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
