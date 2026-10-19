// FILS OF WAR en reseau (18/10) : des maths qui donnent le meme resultat au
// dernier bit sur tous les telephones. En reseau chaque telephone fait tourner
// la meme partie et seuls les ordres circulent ; il suffit qu'un iPhone et un
// Android arrondissent differemment un sinus pour que, dix minutes plus tard,
// les deux royaumes ne se ressemblent plus. Math.sin/cos/atan2/hypot ne sont
// pas garantis d'un moteur JS a l'autre ; + - * / et Math.sqrt le sont (IEEE).
// Le moteur du jeu (jeu.js) appelle FOWM.* a la place (claude/fow/extraire-fow.py).
(function(){
  const HP=1.5707963267948966,PI=3.141592653589793,PI6=0.5235987755982988,R3=1.7320508075688772,T12=0.2679491924311227;
  // Series de Taylor sur [-pi/4, pi/4] : erreur < 1e-16.
  function sinK(x){const z=x*x;return x*(1+z*(-1/6+z*(1/120+z*(-1/5040+z*(1/362880+z*(-1/39916800+z*(1/6227020800+z*(-1/1307674368000+z*(1/355687428096000)))))))));}
  function cosK(x){const z=x*x;return 1+z*(-1/2+z*(1/24+z*(-1/720+z*(1/40320+z*(-1/3628800+z*(1/479001600+z*(-1/87178291200+z*(1/20922789888000))))))));}
  function quart(x,q){
    if(!(x===x)||x===Infinity||x===-Infinity)return NaN;
    const k=Math.round(x/HP),r=x-k*HP,n=(((k+q)%4)+4)%4;
    return n===0?sinK(r):n===1?cosK(r):n===2?-sinK(r):-cosK(r);
  }
  const sin=x=>quart(x,0),cos=x=>quart(x,1);
  // atan sur |x| <= tan(pi/12) : serie alternee, 14 termes.
  function atanK(x){const z=x*x;let s=0;for(let i=27;i>=1;i-=2)s=1/i-z*s;return x*s;}
  function atan(x){
    if(!(x===x))return NaN;
    let neg=x<0;if(neg)x=-x;let inv=false,dec=false;
    if(x>1){x=1/x;inv=true;}
    if(x>T12){x=(x*R3-1)/(x+R3);dec=true;}
    let r=atanK(x);if(dec)r+=PI6;if(inv)r=HP-r;
    return neg?-r:r;
  }
  function atan2(y,x){
    if(!(y===y)||!(x===x))return NaN;
    if(x>0)return atan(y/x);
    if(x<0)return y>=0?atan(y/x)+PI:atan(y/x)-PI;
    return y>0?HP:y<0?-HP:0;
  }
  function hypot(){let s=0;for(let i=0;i<arguments.length;i++){const v=+arguments[i];if(v===Infinity||v===-Infinity)return Infinity;s+=v*v;}return Math.sqrt(s);}
  window.FOWM={sin,cos,atan2,hypot};
})();
