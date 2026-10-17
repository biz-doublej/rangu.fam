"use strict";(()=>{var e={};e.id=4623,e.ids=[4623],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},95736:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.r(t),i.d(t,{originalPathname:()=>g,patchFetch:()=>l,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>c,staticGenerationAsyncStorage:()=>d});var a=i(49303),n=i(88716),o=i(60670),s=i(52867),p=e([s]);s=(p.then?(await p)():p)[0];let u=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/wiki/feed/route",pathname:"/api/wiki/feed",filename:"route",bundlePath:"app/api/wiki/feed/route"},resolvedPagePath:"C:\\Users\\jaewo\\Desktop\\rangu.fam\\src\\app\\api\\wiki\\feed\\route.ts",nextConfigOutput:"standalone",userland:s}),{requestAsyncStorage:m,staticGenerationAsyncStorage:d,serverHooks:c}=u,g="/api/wiki/feed/route";function l(){return(0,o.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:d})}r()}catch(e){r(e)}})},52867:(e,t,i)=>{i.a(e,async(e,r)=>{try{i.r(t),i.d(t,{GET:()=>u,dynamic:()=>m,revalidate:()=>d});var a=i(87070),n=i(57745),o=i(81445),s=i(63719),p=i(31986),l=e([s]);s=(l.then?(await l)():l)[0];let m="force-dynamic",d=600,c="https://irang.wiki",g=e=>String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),h=e=>`<![CDATA[${String(e||"").replace(/]]>/g,"]]]]><![CDATA[>")}]]>`;async function u(){try{let e=(0,s.z)(),t=await e.select({title:p.Mq.title,slug:p.Mq.slug,revisionNumber:p.At.revisionNumber,author:p.At.author,editType:p.At.editType,summary:p.At.summary,sizeChange:p.At.sizeChange,timestampAt:p.At.timestampAt,revId:p.At.id}).from(p.At).innerJoin(p.Mq,(0,n.eq)(p.Mq.id,p.At.pageId)).where((0,n.ne)(p.Mq.isDeleted,!0)).orderBy((0,o.C)(p.At.timestampAt)).limit(50),i=t.map(e=>{let t=`${c}/wiki/${encodeURIComponent(e.title)}`,i=e.sizeChange??0,r=i>0?`(+${i.toLocaleString()})`:i<0?`(${i.toLocaleString()})`:"",a={create:"생성",edit:"편집",revert:"되돌림",delete:"삭제"}[e.editType]||e.editType,n=`[${a}] ${e.title} r${e.revisionNumber} ${r}`.trim(),o=`<p><strong>${g(e.author||"익명")}</strong> 님이 <strong>${g(a)}</strong> 했습니다${r?` ${g(r)}`:""}.</p>${e.summary?`<p>요약: <em>${g(e.summary)}</em></p>`:""}`,s=e.timestampAt?new Date(e.timestampAt).toUTCString():new Date().toUTCString();return`    <item>
      <title>${g(n)}</title>
      <link>${g(t)}</link>
      <guid isPermaLink="false">irang-wiki-rev-${e.revId}</guid>
      <pubDate>${s}</pubDate>
      <author>noreply@irang.wiki (${g(e.author||"익명")})</author>
      <description>${h(o)}</description>
      <category>${g(a)}</category>
    </item>`}).join("\n"),r=t[0]?.timestampAt?new Date(t[0].timestampAt).toUTCString():new Date().toUTCString(),l=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${g("이랑위키 — 최근 변경")}</title>
    <link>${c}/wiki/recent</link>
    <description>${g("이랑위키에서 일어난 모든 편집/생성을 RSS 로 구독하세요.")}</description>
    <language>ko-KR</language>
    <lastBuildDate>${r}</lastBuildDate>
    <atom:link href="${c}/api/wiki/feed" rel="self" type="application/rss+xml" />
${i}
  </channel>
</rss>`;return new a.NextResponse(l,{status:200,headers:{"Content-Type":"application/rss+xml; charset=utf-8","Cache-Control":"public, max-age=600, s-maxage=600"}})}catch(e){return console.error("RSS 생성 실패:",e),new a.NextResponse("RSS feed unavailable",{status:500})}}r()}catch(e){r(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),r=t.X(0,[8948,5972,6001,3719],()=>i(95736));module.exports=r})();