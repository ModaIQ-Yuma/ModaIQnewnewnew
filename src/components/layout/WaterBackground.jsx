import { useRef, useEffect } from "react";

// 全站液态水波背景：WebGL1 FBO 双缓冲波动方程 + 坡度折射 + 色散 + Fresnel。
// 指针驱动（监听 window，canvas 不挡点击）；珍珠蓝紫；动态加强。
const VS = `attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}`;

const SIM = `precision highp float;varying vec2 uv;
uniform sampler2D u_prev;uniform vec2 u_texel;uniform vec2 u_pt;uniform float u_down;
void main(){
  vec4 c=texture2D(u_prev,uv);float h=c.r,hp=c.g;
  float l=texture2D(u_prev,uv-vec2(u_texel.x,0.)).r,r=texture2D(u_prev,uv+vec2(u_texel.x,0.)).r;
  float t=texture2D(u_prev,uv+vec2(0.,u_texel.y)).r,b=texture2D(u_prev,uv-vec2(0.,u_texel.y)).r;
  float tl=texture2D(u_prev,uv+vec2(-u_texel.x,u_texel.y)).r,tr=texture2D(u_prev,uv+vec2(u_texel.x,u_texel.y)).r;
  float bl=texture2D(u_prev,uv+vec2(-u_texel.x,-u_texel.y)).r,br=texture2D(u_prev,uv+vec2(u_texel.x,-u_texel.y)).r;
  float avg=(l+r+t+b)*0.2+(tl+tr+bl+br)*0.05;
  float nh=avg*2.0-hp;
  nh*=mix(0.993,0.982,smoothstep(0.0,0.25,abs(nh)));
  vec2 d=(uv-u_pt);d.x*=u_texel.y/u_texel.x;
  nh+=u_down*smoothstep(0.055,0.0,length(d))*step(0.0,u_pt.x);
  gl_FragColor=vec4(nh,h,0.,1.);
}`;

const REND = `precision highp float;varying vec2 uv;
uniform sampler2D u_field;uniform vec2 u_texel;
vec3 bg(vec2 p){
  vec3 a=vec3(0.82,0.90,0.98),b=vec3(0.91,0.95,1.00),c=vec3(0.74,0.86,0.97),d=vec3(0.80,0.91,1.00);
  vec3 col=mix(a,b,smoothstep(0.0,1.0,p.y));
  col=mix(col,c,0.55*smoothstep(0.95,0.0,distance(p,vec2(0.25,0.85))));
  col=mix(col,d,0.40*smoothstep(0.85,0.0,distance(p,vec2(0.82,0.2))));
  return col;
}
void main(){
  float l=texture2D(u_field,uv-vec2(u_texel.x,0.)).r,r=texture2D(u_field,uv+vec2(u_texel.x,0.)).r;
  float t=texture2D(u_field,uv+vec2(0.,u_texel.y)).r,b=texture2D(u_field,uv-vec2(0.,u_texel.y)).r;
  float h=texture2D(u_field,uv).r;
  vec2 grad=vec2(r-l,t-b);
  vec2 off=grad*0.85;
  vec3 col;
  col.r=bg(uv+off*1.06).r; col.g=bg(uv+off).g; col.b=bg(uv+off*0.94).b;
  vec3 n=normalize(vec3(-grad*3.5,1.0));
  vec3 L=normalize(vec3(0.55,0.7,0.85));
  float nl=max(dot(n,L),0.0);
  col+=pow(nl,80.0)*0.9 + pow(nl,8.0)*0.18 + pow(1.0-n.z,3.0)*vec3(0.5,0.70,1.0)*0.35;
  col+=h*vec3(0.06,0.10,0.20);
  gl_FragColor=vec4(col,1.0);
}`;

export default function WaterBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const cvs = ref.current;
    const gl = cvs.getContext("webgl", { antialias: false }) || cvs.getContext("experimental-webgl");
    if (!gl) return;
    const fe = gl.getExtension("OES_texture_float");
    const hfe = gl.getExtension("OES_texture_half_float");
    const FT = fe ? gl.FLOAT : hfe ? hfe.HALF_FLOAT_OES : null;
    if (!FT) return;

    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const prog = (vs, fs) => { const p = gl.createProgram(); const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs); if (!a || !b) return null; gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
    const simP = prog(VS, SIM), rendP = prog(VS, REND);
    if (!simP || !rendP) return;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    let A, B, simW, simH;
    const mkTex = (w, h) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, FT, null);
      [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, fb, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cvs.width = Math.floor(innerWidth * dpr); cvs.height = Math.floor(innerHeight * dpr);
      simW = Math.max(2, Math.floor(cvs.width * 0.5)); simH = Math.max(2, Math.floor(cvs.height * 0.5));
      A = mkTex(simW, simH); B = mkTex(simW, simH);
    };
    resize();
    if (!A.ok || !B.ok) return;

    const bindQuad = (p) => { const loc = gl.getAttribLocation(p, "p"); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); };
    let pt = [-1, -1], down = 0, lastMove = 0;
    const setPt = (x, y, s) => { pt = [x, 1 - y]; down = s; lastMove = performance.now(); };
    const onMove = (e) => setPt(e.clientX / innerWidth, e.clientY / innerHeight, 0.07);
    const onDown = (e) => setPt(e.clientX / innerWidth, e.clientY / innerHeight, 0.4);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const step = () => {
      gl.useProgram(simP); gl.viewport(0, 0, simW, simH); gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(gl.getUniformLocation(simP, "u_prev"), 0);
      gl.uniform2f(gl.getUniformLocation(simP, "u_texel"), 1 / simW, 1 / simH);
      gl.uniform2f(gl.getUniformLocation(simP, "u_pt"), pt[0], pt[1]);
      gl.uniform1f(gl.getUniformLocation(simP, "u_down"), down);
      bindQuad(simP); gl.drawArrays(gl.TRIANGLES, 0, 6);
      const tmp = A; A = B; B = tmp;
    };
    const draw = () => {
      gl.useProgram(rendP); gl.viewport(0, 0, cvs.width, cvs.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(gl.getUniformLocation(rendP, "u_field"), 0);
      gl.uniform2f(gl.getUniformLocation(rendP, "u_texel"), 1 / simW, 1 / simH);
      bindQuad(rendP); gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    let raf, amb = 0, alive = true;
    const loop = (ts) => {
      if (!alive) return;
      if (ts - lastMove > 1000 && ts - amb > 1100) { amb = ts; setPt(Math.random(), Math.random(), 0.22); }
      step(); down *= 0.6; if (down < 0.001) { down = 0; pt = [-1, -1]; }
      draw(); raf = requestAnimationFrame(loop);
    };
    if (reduce) { draw(); } else { raf = requestAnimationFrame(loop); }

    const onVis = () => { if (document.hidden) { alive = false; cancelAnimationFrame(raf); } else if (!reduce) { alive = true; raf = requestAnimationFrame(loop); } };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", display: "block" }} />;
}
