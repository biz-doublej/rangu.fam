using Rangu.Tactics.Proto.V1;          // proto 타입은 unqualified
using Engine = Rangu.Tactics.Engine;   // 엔진 타입은 Engine. 로 한정

namespace Rangu.Tactics.Server.Mapping;

/// <summary>
/// 엔진 GameEvent(느슨한 Type/Detail) → proto Event(수신자 마스킹). 연출(애니메이션)용.
///
/// V1: 전투 연출에 필요한 "공개" 이벤트만 매핑(unitDamaged/unitDied/nexusDamaged/gameOver).
/// 이들은 모두 보드/넥서스 공개 정보 → viewer 무관(gameOver 결과만 viewer 상대) → 사적 정보 누출 없음.
/// 카드 공개성 이벤트(draw/cardBurned 등)는 매핑하지 않음(상대 패 누출 위험 원천 차단 = 마스킹).
/// </summary>
public static class EventMapper
{
    public static Event? ToProto(Engine.GameEvent ev, Engine.PlayerSlot viewer, ulong seq, long timeMs)
    {
        switch (ev.Type)
        {
            case "unitDamaged":
            {
                var d = ev.Detail!;
                var inst = new DamageInstance
                {
                    Target = new Target { CardInstanceId = AsString(d, "target") },
                    Amount = AsInt(d, "amount"),
                    IsLethal = d.TryGetValue("lethal", out var l) && l is true,
                };
                return Wrap(seq, timeMs, e => e.DamageDealt = new DamageDealtEvent { Instances = { inst } });
            }
            case "unitDied":
            {
                var died = new UnitDiedEvent { MovedTo = Zone.Graveyard };
                if (ev.Detail is { } det && det.TryGetValue("ids", out var ids) && ids is IEnumerable<string> list)
                    died.InstanceIds.AddRange(list);
                return Wrap(seq, timeMs, e => e.UnitDied = died);
            }
            case "nexusDamaged":
            {
                var d = ev.Detail!;
                return Wrap(seq, timeMs, e => e.NexusDamaged = new NexusDamagedEvent
                {
                    Player = SeatRef(AsString(d, "slot")),
                    Amount = AsInt(d, "amount"),
                    NewNexusHealth = AsInt(d, "health"),
                });
            }
            case "gameOver":
            {
                var winnerTag = ev.Detail is { } d && d.TryGetValue("winner", out var w) ? w as string : null;
                var go = new GameOverEvent { Reason = "nexus_destroyed" };
                if (winnerTag is null)
                {
                    go.ViewerResult = GameOverEvent.Types.Result.Draw;
                }
                else
                {
                    var winnerSeat = TagSeat(winnerTag);
                    go.Winner = new PlayerRef { Seat = winnerSeat };
                    go.ViewerResult = winnerSeat == ViewerSeat(viewer)
                        ? GameOverEvent.Types.Result.Win
                        : GameOverEvent.Types.Result.Loss;
                }
                return Wrap(seq, timeMs, e => e.GameOver = go);
            }
            default:
                return null; // 연출 불필요(또는 마스킹 민감) 이벤트는 스킵
        }
    }

    private static Event Wrap(ulong seq, long timeMs, Action<Event> set)
    {
        var e = new Event { SequenceNumber = seq, ServerTimeUnixMs = timeMs };
        set(e);
        return e;
    }

    private static PlayerRef SeatRef(string tag) => new() { Seat = TagSeat(tag) };
    private static uint TagSeat(string? tag) => tag == "p2" ? 1u : 0u;
    private static uint ViewerSeat(Engine.PlayerSlot v) => v == Engine.PlayerSlot.P1 ? 0u : 1u;

    private static string AsString(IReadOnlyDictionary<string, object?> d, string k)
        => d.TryGetValue(k, out var v) ? v as string ?? "" : "";
    private static int AsInt(IReadOnlyDictionary<string, object?> d, string k)
        => d.TryGetValue(k, out var v) && v is not null ? Convert.ToInt32(v) : 0;
}
