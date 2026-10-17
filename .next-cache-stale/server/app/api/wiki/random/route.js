"use strict";(()=>{var e={};e.id=6002,e.ids=[6002],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8678:e=>{e.exports=import("pg")},17152:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>R,patchFetch:()=>u,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>l});var s=a(49303),i=a(88716),n=a(60670),o=a(92395),p=e([o]);o=(p.then?(await p)():p)[0];let c=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/wiki/random/route",pathname:"/api/wiki/random",filename:"route",bundlePath:"app/api/wiki/random/route"},resolvedPagePath:"C:\\Users\\jaewo\\Desktop\\rangu.fam\\src\\app\\api\\wiki\\random\\route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:m}=c,R="/api/wiki/random/route";function u(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:l})}r()}catch(e){r(e)}})},92395:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>p,dynamic:()=>u});var s=a(87070),i=a(62315),n=a(63719),o=e([n]);n=(o.then?(await o)():o)[0];let u="force-dynamic";async function p(e){try{let t=(0,n.z)(),a=e.nextUrl.searchParams.get("namespace")?.trim()||"",r=await t.execute(a?(0,i.i6)`
            SELECT title, slug, namespace
            FROM wiki_pages
            WHERE is_deleted IS NOT TRUE AND namespace = ${a}
            ORDER BY RANDOM()
            LIMIT 1
          `:(0,i.i6)`
            SELECT title, slug, namespace
            FROM wiki_pages
            WHERE is_deleted IS NOT TRUE
            ORDER BY RANDOM()
            LIMIT 1
          `),o=(r.rows??r)[0];if(!o)return s.NextResponse.json({success:!1,error:"표시할 문서가 없습니다."},{status:404});return s.NextResponse.json({success:!0,title:o.title,slug:o.slug,namespace:o.namespace})}catch(e){return console.error("임의 문서 선택 오류:",e),s.NextResponse.json({success:!1,error:"임의 문서를 불러오지 못했습니다."},{status:500})}}r()}catch(e){r(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[8948,5972,6001,3719],()=>a(17152));module.exports=r})();