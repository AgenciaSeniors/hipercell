'use strict';
(() => {
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),pointer=matchMedia('(hover: hover) and (pointer: fine)');
  const button=document.getElementById('motion-toggle'),stage=document.querySelector('.hyper-stage');
  let paused=false,frame=0,pending=null;
  try{paused=localStorage.getItem('hipercell:motion')==='off';}catch{}
  function sync(){const off=paused||reduce.matches;document.body.dataset.motion=off?'off':'on';button.setAttribute('aria-pressed',String(off));button.textContent=off?'Movimiento pausado ◇':'Pausar movimiento ◇';button.disabled=reduce.matches;}
  button.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('hipercell:motion',paused?'off':'on');}catch{}sync();});reduce.addEventListener('change',sync);sync();
  function paint(){frame=0;if(!pending||document.body.dataset.motion==='off'||!pointer.matches)return;const {target,x,y}=pending;const box=target.getBoundingClientRect();if(!box.width||!box.height)return;const dx=(x-box.left)/box.width-.5,dy=(y-box.top)/box.height-.5;target.style.setProperty(target===stage?'--stage-x':'--card-x',(-dy*7).toFixed(2)+'deg');target.style.setProperty(target===stage?'--stage-y':'--card-y',(dx*9).toFixed(2)+'deg');}
  document.addEventListener('pointermove',event=>{if(document.body.dataset.motion==='off'||!pointer.matches)return;const art=event.target.closest('.hero-art');const target=art?stage:event.target.closest('.catalog .product-card');if(!target)return;pending={target,x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(paint);},{passive:true});
  document.addEventListener('pointerout',event=>{const target=event.target.closest('.product-card,.hero-art');if(target&&!target.contains(event.relatedTarget)){const item=target.classList.contains('hero-art')?stage:target;for(const name of ['--stage-x','--stage-y','--card-x','--card-y'])item.style.removeProperty(name);pending=null;}},{passive:true});
  let scrollFrame=0;window.addEventListener('scroll',()=>{if(scrollFrame||document.body.dataset.motion==='off')return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;document.documentElement.style.setProperty('--space-y',(-Math.min(scrollY,1800)*.035).toFixed(1)+'px');});},{passive:true});
})();
