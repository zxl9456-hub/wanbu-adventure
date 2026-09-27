// A visible return route keeps the optional activities connected to the story.
if(new URLSearchParams(location.search).get('from')==='campus'&&!location.pathname.endsWith('/lab.html')){
 const makeLink=()=>{const a=document.createElement('a');a.href='./campus.html';a.textContent='← 返回同心之旅';a.style.cssText='display:inline-block;color:inherit;font:12px system-ui;padding:12px 16px;border:1px solid #aab99577;border-radius:5px;margin-top:16px;';return a;};
 const intro=document.querySelector('.intro-copy');if(intro)intro.append(makeLink());
 const dialogBody=document.getElementById('dialog-body');if(dialogBody){const observer=new MutationObserver(()=>{if(!dialogBody.querySelector('a[href="./campus.html"]'))dialogBody.append(makeLink());});observer.observe(dialogBody,{childList:true});}
}
