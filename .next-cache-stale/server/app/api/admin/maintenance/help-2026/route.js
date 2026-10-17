"use strict";(()=>{var e={};e.id=39,e.ids=[39],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},76162:e=>{e.exports=require("stream")},21764:e=>{e.exports=require("util")},8678:e=>{e.exports=import("pg")},98054:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.r(t),r.d(t,{originalPathname:()=>p,patchFetch:()=>u,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>f,staticGenerationAsyncStorage:()=>m});var n=r(49303),a=r(88716),s=r(60670),o=r(90294),l=e([o]);o=(l.then?(await l)():l)[0];let c=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/admin/maintenance/help-2026/route",pathname:"/api/admin/maintenance/help-2026",filename:"route",bundlePath:"app/api/admin/maintenance/help-2026/route"},resolvedPagePath:"C:\\Users\\jaewo\\Desktop\\rangu.fam\\src\\app\\api\\admin\\maintenance\\help-2026\\route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:m,serverHooks:f}=c,p="/api/admin/maintenance/help-2026/route";function u(){return(0,s.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:m})}i()}catch(e){i(e)}})},90294:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.r(t),r.d(t,{GET:()=>c,dynamic:()=>d});var n=r(87070),a=r(57745),s=r(63719),o=r(31986),l=r(53930),u=e([s,l]);[s,l]=u.then?(await u)():u;let d="force-dynamic",m="이랑위키:도움말_2026",f=`= 이랑위키 편집 도움말 (2026 개편) =

:::info
이 문서는 2026년 6월 업데이트로 추가된 새 문법을 정리한 도움말입니다. 기본 문법은 [[이랑위키:문법]]을 참고하세요. 아래 예시들은 실제로 렌더링되어 보이므로, 편집 버튼을 눌러 원문과 비교하며 익히는 것을 추천합니다.
:::

== 표 꾸미기 ==

=== 행 단위 색상 — 한 번만 적으면 끝 ===
이제 칸마다 색을 반복해서 적을 필요가 없습니다. '''행의 첫 칸'''에 한 번만 적으면 그 행 전체에 적용됩니다.

\`\`\`
|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||
\`\`\`

|| <rowbgcolor:#4472C4 rowcolor:#ffffff>헤더1 || 헤더2 || 헤더3 ||
|| 데이터1 || <bgcolor:#F8D7DA>이 칸만 강조 || 데이터3 ||

* \`<rowbgcolor:#색>\` — 행 전체 배경 / \`<rowcolor:#색>\` — 행 전체 글자색
* \`<bgcolor:#색>\` \`<color:#색>\` — 그 칸 하나만 (행 설정을 덮어씀)
* 표 전체는 '''첫 칸'''에 \`<tablebgcolor:#색>\` \`<tablecolor:#색>\`
* 우선순위: '''셀 > 행 > 표'''

=== 정렬과 폰트 ===
* \`<align:center>\` — 그 칸 가운데 정렬 (left / center / right)
* \`<rowalign:center>\` — 행 전체 정렬
* \`<tablealign:center>\` — 표 전체 정렬 (첫 칸에)
* \`<font:궁서체>\` — 폰트 지정. 공백 있는 폰트는 \`<font:"Noto Sans KR">\` 처럼 따옴표

=== 칸 병합 (열/행 합치기) ===
* \`<-숫자>\` — 가로(열) 병합 / \`<|숫자>\` — 세로(행) 병합
* 병합으로 가려지는 칸은 '''쓰지 않고 생략'''합니다.

\`\`\`
|| <-5><bgcolor:#c4002e><color:#ffffff>'''김영우의 연도별 시즌 일람''' ||
|| 2025년 || → || '''2026년''' || → || 2027년 ||
\`\`\`

|| <-5><bgcolor:#c4002e><color:#ffffff>'''김영우의 연도별 시즌 일람''' ||
|| 2025년 || → || '''2026년''' || → || 2027년 ||

== 본문 꾸미기 ==

* \`{{{#ff0000 빨간 글씨}}}\` — 색상
* \`{{{+1 큰 글씨}}}\` / \`{{{-1 작은 글씨}}}\` — 크기
* \`{{{font:"맑은 고딕" 폰트 바꾸기}}}\` — '''(신규)''' 본문 폰트

== 넘겨주기(redirect)와 하위 문서 ==

문서의 '''첫 줄'''에 아래처럼 쓰면 그 문서로 들어왔을 때 자동으로 대상 문서로 이동합니다.

\`\`\`
#redirect 강한울
\`\`\`

* \`#redirect 대상\` / \`#넘겨주기 대상\` 모두 인식
* 넘겨주기 문서 자체를 보려면 주소 뒤에 \`?noredirect=1\`
* 하위 문서는 제목에 \`/\`를 넣어 만듭니다 — 예: \`강한울/야구\`, \`정재원/여담\`. 본문에서는 \`[[강한울/야구]]\`로 링크

== 타임라인 ==

사건\xb7여행 일지를 세로 연표로 보여줍니다. 각 줄은 \`날짜 | 제목 | 설명(선택)\` 형식.

\`\`\`
:::timeline
2024-03-20 | 랑구 결성 | 태릉고 동창들이 모였다
2025-01-01 | 새해 다짐
:::
\`\`\`

:::timeline
2024-03-20 | 랑구 결성 | 태릉고 동창들이 모였다
2025-01-01 | 새해 다짐
:::

== 투표 ==

문서 안에 실시간 투표를 넣을 수 있습니다. 첫 줄에 질문, 다음 줄부터 선택지(2개 이상).

\`\`\`
:::poll 다음 모임 메뉴는?
햄버거
커피
치킨
:::
\`\`\`

:::poll 다음 모임 메뉴는?
햄버거
커피
치킨
:::

* 로그인한 사용자만 투표 가능, 1인 1표(다시 누르면 변경)
* 질문이나 선택지를 수정하면 '''새 투표'''로 취급됩니다

== 둘러보기 기능 ==

* '''지식 그래프''' — 왼쪽 탐색 메뉴의 "지식 그래프"에서 문서들의 연결망을 별자리처럼 봅니다. 점 클릭 = 문서 이동, 드래그 = 이동, 휠 = 확대/축소
* '''기여 잔디\xb7칭호''' — 왼쪽 메뉴 "기여자" 페이지에서 새싹 아이콘을 누르면 1년 편집 잔디와 획득 칭호가 보입니다
* '''고립 문서''' — 어떤 문서와도 연결되지 않은 문서는 상단에 안내가 뜹니다. 다른 문서에서 \`[[문서명]]\`으로 이어주세요

== 편집기 팁 ==

* 툴바에 폰트\xb7타임라인\xb7투표 버튼과 '''색상 표(행 단위)''' 템플릿이 추가되었습니다
* 표 색상 선택기에서 #코드를 입력하면 '''실시간 미리보기'''가 보입니다
* \`Ctrl+Enter\` — 미리보기 토글 / \`Ctrl+S\` — 저장

[[분류:도움말]]`;async function c(e){try{let t=await (0,l.A)(e);if(!t)return n.NextResponse.json({success:!1,error:"관리자 권한이 필요합니다."},{status:403});let r=(0,s.z)(),[i]=await r.select().from(o.Mq).where((0,a.xD)((0,a.ne)(o.Mq.isDeleted,!0),(0,a.or)((0,a.eq)(o.Mq.title,m),(0,a.eq)(o.Mq.slug,m)))).limit(1),{searchParams:u}=new URL(e.url);if("1"!==u.get("confirm"))return n.NextResponse.json({success:!0,applied:!1,message:"dry-run — ?confirm=1 로 호출하면 도움말을 갱신합니다.",target:m,exists:!!i,currentRevision:i?.currentRevision??null,newContentLength:f.length});let c=new Date;if(i){let e=i.currentRevision+1;return await r.insert(o.At).values({pageId:i.id,revisionNumber:e,content:f,summary:"2026-06 패치 문법으로 도움말 전면 갱신",author:t.username,authorId:t.userId,editType:"edit",isMinorEdit:!1,isAutomated:!0,contentLength:f.length,sizeChange:f.length-(i.content?.length||0),isVerified:!0,timestampAt:c}),await r.update(o.Mq).set({content:f,lastEditor:t.username,lastEditorId:t.userId,lastEditDate:c,lastEditSummary:"2026-06 패치 문법으로 도움말 전면 갱신",currentRevision:e,edits:i.edits+1,isStub:!1,updatedAt:c}).where((0,a.eq)(o.Mq.id,i.id)),n.NextResponse.json({success:!0,applied:!0,message:`"${m}" 갱신 완료 (r${e}).`,appliedBy:t.username})}let[d]=await r.insert(o.Mq).values({title:m,slug:m,namespace:"help",content:f,summary:"편집기 사용법 — 표 색상/병합, 타임라인, 투표 등 2026 신규 문법 안내",categories:["도움말"],creator:t.username,creatorId:t.userId,lastEditor:t.username,lastEditorId:t.userId,lastEditDate:c,lastEditSummary:"2026 도움말 생성",currentRevision:1,edits:1,watchers:[t.userId]}).returning({id:o.Mq.id});return await r.insert(o.At).values({pageId:d.id,revisionNumber:1,content:f,summary:"2026 도움말 생성",author:t.username,authorId:t.userId,editType:"create",isMinorEdit:!1,isAutomated:!0,contentLength:f.length,sizeChange:f.length,isVerified:!0,timestampAt:c}),n.NextResponse.json({success:!0,applied:!0,message:`"${m}" 생성 완료.`,appliedBy:t.username})}catch(e){return console.error("help-2026 갱신 오류:",e),n.NextResponse.json({success:!1,error:"도움말 갱신 중 오류가 발생했습니다.",detail:e instanceof Error?e.message:String(e)},{status:500})}}i()}catch(e){i(e)}})},53930:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.d(t,{A:()=>m});var n=r(37848),a=r(41482),s=r.n(a),o=r(57745),l=r(63719),u=r(31986),c=r(10289),d=e([l,c]);[l,c]=d.then?(await d)():d;let f=(0,n.NW)("JWT_SECRET");async function m(e){try{let t=e.headers.get("authorization"),r=t?.startsWith("Bearer ")?t.substring(7):null,i=e.cookies.get("wiki-token")?.value||null,n=[r,i].filter(Boolean);if(0===n.length)return null;let a=(0,l.z)();for(let e of n)try{let t=s().verify(e,f),r=t?.userId,i=t?.username;if(!r&&!i)continue;let n=null;if(r){let[e]=await a.select().from(u.NA).where((0,o.eq)(u.NA.id,r)).limit(1);n=e}else if(i){let[e]=await a.select().from(u.NA).where((0,o.eq)(u.NA.username,i)).limit(1);n=e}if(!n||(n=await (0,c.gs)(n),"admin"!==n.role))continue;return{userId:n.id,username:n.username,role:"admin"}}catch{continue}return null}catch{return null}}i()}catch(e){i(e)}})},10289:(e,t,r)=>{r.a(e,async(e,i)=>{try{r.d(t,{Ck:()=>E,DB:()=>x,HW:()=>y,Ik:()=>w,Jr:()=>q,NA:()=>$,Qn:()=>D,R4:()=>R,Zf:()=>k,_v:()=>_,bK:()=>C,fe:()=>S,gs:()=>A,sx:()=>M,uw:()=>v});var n=r(37848),a=r(10627),s=r(41482),o=r.n(s),l=r(57745),u=r(63719),c=r(31986),d=r(84770),m=r.n(d),f=e([u]);u=(f.then?(await f)():f)[0];let L="doublej-token",P="wiki-token",z=(0,n.NW)("JWT_SECRET"),B={gabrieljung0727:"jaewon",txxse0k:"minseok","sd_kim.h.s":"seungchan",jinq09012239:"jinkyu","k.seoljin":"hanul"},U={gabriel0727:"gabrieljung0727",seoko1752:"seoko1752",kanghu05:"k.seoljin","7738bell":"alaudabell"},W={jung051004:"jaewon"},T={"jaewonjung1004@gmail.com":"jaewon","kanghu05@gmail.com":"hanul","jinq0901@gmail.com":"jinkyu","05alstjr@gmail.com":"minseok","mushbit@naver.com":"seungchan","3gb3gb1004@gmail.com":"seungchan"},F=new Set(["jaewonjung1004@gmail.com","kanghu05@gmail.com"]),J=new Set(["gabriel0727","kanghu05","jung051004"]);function p(e){return e&&e.toString().trim().toLowerCase()||null}function g(e){return e&&e.toString().trim().toLowerCase()||null}function h(e){if(!e)return null;let t=e.toLowerCase().trim();return W[t]?W[t]:"jingyu"===t?"jinkyu":(0,a.I)(t)?t:null}function w(e){let t=p(e.email);if(t&&T[t])return T[t];let r=g(e.discordUsername||e.discordId);return r&&B[r]?B[r]:h(e.username)}function y(e){let t=e.username?.toLowerCase().trim()||"";if(t&&J.has(t))return!0;let r=p(e.email);if(r&&F.has(r))return!0;let i=U[t];return!!i&&g(e.discordUsername||e.discordId)===g(i)}async function A(e){if(!e)return null;let t=y(e),r=!1;if(t?("admin"!==e.role&&(e.role="admin",r=!0),e.permissions?.canEdit&&e.permissions?.canDelete&&e.permissions?.canProtect&&e.permissions?.canBan&&e.permissions?.canManageUsers||(e.permissions={canEdit:!0,canDelete:!0,canProtect:!0,canBan:!0,canManageUsers:!0},r=!0)):(("admin"===e.role||"owner"===e.role||"moderator"===e.role)&&(e.role="editor",r=!0),(!e.permissions?.canEdit||e.permissions?.canDelete||e.permissions?.canProtect||e.permissions?.canBan||e.permissions?.canManageUsers)&&(e.permissions={canEdit:!0,canDelete:!1,canProtect:!1,canBan:!1,canManageUsers:!1},r=!0)),r){if("function"==typeof e.save)await e.save();else if(e.id)try{let t=(0,u.z)();await t.update(c.NA).set({role:e.role,permissions:e.permissions,updatedAt:new Date}).where((0,l.eq)(c.NA.id,e.id))}catch(e){console.error("enforceUserAccessPolicy persist failed:",e)}}return e}function v(e){return o().sign({userId:String(e._id||e.id),username:e.username,role:e.role},z,{expiresIn:"7d"})}function b(e){let t=(e||"").toString().trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,20);return t.length>=3?t:t?`${t}x`.slice(0,20):`user-${Date.now().toString().slice(-6)}`}async function j(e){let t=b(e),r=(0,u.z)(),i=async e=>{let[t]=await r.select({id:c.NA.id}).from(c.NA).where((0,l.eq)(c.NA.username,e)).limit(1);return!!t};if(!await i(t))return t;for(let e=1;e<1e3;e+=1){let r=`${t}-${e}`.slice(0,20);if(!await i(r))return r}return`${t.slice(0,12)}-${Date.now().toString().slice(-6)}`.slice(0,20)}async function N(e){let t=(e||"").trim().toLowerCase()||`user-${Date.now().toString().slice(-6)}@doublej.local`,r=(0,u.z)(),i=async e=>{let[t]=await r.select({id:c.NA.id}).from(c.NA).where((0,l.eq)(c.NA.email,e)).limit(1);return!!t};if(!await i(t))return t;let[n,a]=t.split("@"),s=a||"doublej.local";for(let e=1;e<1e3;e+=1){let t=`${n}-${e}@${s}`;if(!await i(t))return t}return`${n.slice(0,12)}-${Date.now().toString().slice(-6)}@${s}`}async function k(e){let t=(0,u.z)(),r=e.subject?.trim();if(!r)return null;let i=b(e.username),n=e.email?.trim().toLowerCase();if(!n||!e.emailVerified)return null;let a=e.displayName?.trim(),s=e.avatar?.trim(),[o]=await t.select().from(c.NA).where((0,l.eq)(c.NA.ssoSubject,r)).limit(1);if(!o){let[e]=await t.select().from(c.NA).where((0,l.eq)(c.NA.email,n)).limit(1);o=e}let d=new Date;if(o){let e={lastLogin:d,lastActivity:d,updatedAt:d};if(o.ssoSubject&&o.ssoSubject===r||(e.ssoSubject=r),o.email!==n){let[r]=await t.select({id:c.NA.id}).from(c.NA).where((0,l.eq)(c.NA.email,n)).limit(1);r&&r.id!==o.id||(e.email=n)}a&&o.displayName!==a&&(e.displayName=a),s&&o.avatar!==s&&(e.avatar=s);let[i]=await t.update(c.NA).set(e).where((0,l.eq)(c.NA.id,o.id)).returning();o=i}else{let e=!function(e){let t=e.toLowerCase().trim();return J.has(t)||!!U[t]||!!h(t)||["admin","administrator","root","system","moderator"].includes(t)}(i)?i:`${i.slice(0,15)}-user`,l=await j(e),u=await N(n),f=`__oidc__${m().randomBytes(48).toString("base64")}`,[p]=await t.insert(c.NA).values({username:l,email:u,password:f,ssoSubject:r,displayName:a||l,avatar:s||null,role:"editor",permissions:{canEdit:!0,canDelete:!1,canProtect:!1,canBan:!1,canManageUsers:!1},edits:0,pagesCreated:0,discussionPosts:0,reputation:0,preferences:{theme:"auto",timezone:"Asia/Seoul",emailNotifications:!0,showEmail:!1,autoWatchPages:!0},isActive:!0,lastLogin:d,lastActivity:d}).returning();o=p}return o?(o._id=o.id,A(o)):null}function x(e){return o().sign({uid:e,purpose:"desktop_handoff"},z,{expiresIn:"120s"})}function q(e){try{let t=o().verify(e,z);if(t?.purpose!=="desktop_handoff")return null;return("string"==typeof t.uid?t.uid.trim():"")||null}catch{return null}}function S(e){return o().sign({userId:String(e._id||e.id),username:e.username,role:e.role,permissions:e.permissions},z,{expiresIn:"7d"})}function I(){return{httpOnly:!0,secure:!0,sameSite:"strict",maxAge:604800,path:"/"}}function E(e,t){e.cookies.set(L,t,I())}function C(e){e.cookies.set(L,"",{...I(),maxAge:0})}function D(e,t){e.cookies.set(P,t,I())}function $(e){e.cookies.set(P,"",{...I(),maxAge:0})}async function R(e){let t=e.cookies.get(L)?.value;if(!t)return null;let r=function(e){try{return o().verify(e,z)}catch{return null}}(t);if(!r?.userId)return null;let i=(0,u.z)(),[n]=await i.select().from(c.NA).where((0,l.eq)(c.NA.id,r.userId)).limit(1);return!n||!n.isActive||n.banStatus?.isBanned?null:(n._id=n.id,A(n))}function _(e){let t=w(e);return{id:String(e._id||e.id),username:e.username,email:e.email||"",role:t?"member":"guest",memberId:t||void 0,isLoggedIn:!0,discordId:e.discordId||void 0,avatar:e.avatar||e.discordAvatar||void 0}}function M(e,t="/"){return!e||!e.startsWith("/")||e.startsWith("//")?t:e}i()}catch(e){i(e)}})},10627:(e,t,r)=>{r.d(t,{I:()=>n});let i=new Set([{id:"hanul",name:"강한울",avatar:"/images/profile/hu.jpg"},{id:"jaewon",name:"정재원",avatar:"/images/profile/jw.jpg"},{id:"minseok",name:"정민석",avatar:"/images/profile/ms.png"},{id:"seungchan",name:"이승찬",avatar:"/images/profile/sc.jpg"},{id:"jinkyu",name:"정진규",avatar:"/images/profile/jq.jpg"}].map(e=>e.id));function n(e){return i.has(e)}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[8948,5972,6001,1482,3719],()=>r(98054));module.exports=i})();