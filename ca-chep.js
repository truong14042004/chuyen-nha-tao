/**
 * CHUYỆN NHÀ TÁO — HERO "ĐÊM 23 THÁNG CHẠP: ÔNG TÁO CƯỠI CÁ CHÉP VỀ TRỜI"
 *
 * Dựa trên toàn bộ code pen "Flying lanterns and a Koi fish (instancing + DataTexture)"
 * của Paul (prisoner849) — https://codepen.io/prisoner849/pen/WNQNdpv
 *  - 500 đèn trời instanced bay lên, lửa chập chờn (giữ nguyên shader gốc)
 *  - model cá fish.stl gốc, uốn theo đường cong khép kín qua DataTexture
 * Thay đổi so với pen:
 *  - cá được tô màu CÁ CHÉP (vảy vàng đồng, lưng đỏ sẫm, bụng vàng nhạt, vây đỏ cam)
 *    bằng shader thủ tục thay cho wireframe cam
 *  - API three r147 (RGBAFormat, LatheGeometry), quẫy đuôi nhẹ
 *  - chuột xoay nhẹ góc nhìn thay OrbitControls (không chặn cuộn trang)
 *  - dừng render khi khuất màn hình, tôn trọng prefers-reduced-motion
 */
(function () {
  const stage = document.getElementById('hero-stage');
  if (!stage || typeof THREE === 'undefined') return;

  const params = new URLSearchParams(location.search);
  let motionPref = null;
  try { motionPref = localStorage.getItem('cnt_motion'); } catch (e) { /* bỏ qua */ }
  const osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceMotion = params.get('motion') === '1' ? false : motionPref ? motionPref === 'reduced' : osReduce;
  const isSmall = window.matchMedia('(max-width: 720px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    stage.classList.add('is-fallback');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, stage.clientWidth / stage.clientHeight, 0.1, 500);
  camera.position.set(0, -25, 80);

  // ---------------------------------------------------------------- lanterns
  let geoms = [];
  let pts = [
    new THREE.Vector2(0, 1. - 0),
    new THREE.Vector2(0.25, 1. - 0),
    new THREE.Vector2(0.25, 1. - 0.125),
    new THREE.Vector2(0.45, 1. - 0.125),
    new THREE.Vector2(0.45, 1. - 0.95)
  ];
  geoms.push(new THREE.LatheGeometry(pts, 20));
  geoms.push(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20));
  var fullGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms);

  var instGeom = new THREE.InstancedBufferGeometry().copy(fullGeom);
  var num = isSmall ? 300 : 500;
  instGeom.instanceCount = num;
  let instPos = []; // 3
  let instSpeed = []; // 1
  let instLight = []; // 2 (initial intensity, frequency)
  for (let i = 0; i < num; i++) {
    instPos.push(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    instSpeed.push(Math.random() * 0.25 + 1);
    instLight.push(Math.PI + (Math.PI * Math.random()), Math.random() + 5);
  }
  instGeom.setAttribute('instPos', new THREE.InstancedBufferAttribute(new Float32Array(instPos), 3));
  instGeom.setAttribute('instSpeed', new THREE.InstancedBufferAttribute(new Float32Array(instSpeed), 1));
  // Giữ đúng như pen gốc (dùng instPos làm dữ liệu nhấp nháy)
  instGeom.setAttribute('instLight', new THREE.InstancedBufferAttribute(new Float32Array(instPos), 2));

  var mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLight: { value: new THREE.Color('red').multiplyScalar(1.5) },
      uColor: { value: new THREE.Color('maroon').multiplyScalar(1) },
      uFire: { value: new THREE.Color(1, 0.75, 0) }
    },
    vertexShader: `
      uniform float uTime;

      attribute vec3 instPos;
      attribute float instSpeed;
      attribute vec2 instLight;

      varying vec2 vInstLight;
      varying float vY;

      void main() {
        vInstLight = instLight;
        vY = position.y;

        vec3 pos = vec3(position) * 2.;
        vec3 iPos = instPos * 200.;

        iPos.xz += vec2(
          cos(instLight.x + instLight.y * uTime),
          sin(instLight.x + instLight.y * uTime * fract(sin(instLight.x)))
        );

        iPos.y = mod(iPos.y + 100. + (uTime * instSpeed), 200.) - 100.;
        pos += iPos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uLight;
      uniform vec3 uColor;
      uniform vec3 uFire;

      varying vec2 vInstLight;
      varying float vY;

      void main() {
        vec3 col = vec3(0);
        float t = vInstLight.x + (vInstLight.y * uTime * 10.);
        float ts = sin(t * 3.14) * 0.5 + 0.5;
        float tc = cos(t * 2.7) * 0.5 + 0.5;
        float f = smoothstep(0.12, 0.12 + (ts + tc) * 0.25, vY);
        float li = (0.5 + smoothstep(0., 1., ts * ts + tc * tc) * 0.5);
        col = mix(uLight * li, uColor * (0.75 + li * 0.25), f);
        col = mix(col, uFire, step(vY, 0.05) * (0.75 + li * 0.25));
        gl_FragColor = vec4(col, 1);
      }
    `,
    side: THREE.DoubleSide
  });

  var lantern = new THREE.Mesh(instGeom, mat);
  lantern.frustumCulled = false;
  scene.add(lantern);

  // ---------------------------------------------------- ánh sáng cho cá chép
  // Ánh lửa đỏ cam từ đèn trời phía dưới + ánh trăng ấm phía trên
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x4a1206, 0.8));
  const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.1);
  keyLight.position.set(20, 40, 60);
  scene.add(keyLight);
  const fireLight = new THREE.DirectionalLight(0xff4a10, 0.8);
  fireLight.position.set(-10, -60, 20);
  scene.add(fireLight);

  // ---------------------------------------------------------------- Koi → Cá chép
  let oUs = [];

  // Tô màu cá chép theo toạ độ gốc của model (chuẩn hoá về -0.5..0.5)
  const carpColorGLSL = `
    varying vec3 vLocal;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Vảy cá: lưới so le, mỗi vảy là cung tròn có viền tối và tâm sáng
    float scalePattern(vec2 uv, out float rim) {
      uv.x += step(1., mod(floor(uv.y), 2.)) * 0.5;
      vec2 cell = fract(uv) - vec2(0.5, 0.15);
      float d = length(cell * vec2(1., 1.25));
      rim = smoothstep(0.42, 0.55, d) * (1. - smoothstep(0.55, 0.7, d));
      return 1. - smoothstep(0.0, 0.55, d);
    }

    vec3 carpColor(vec3 p, out float finMask) {
      float d = p.z;          // -0.5 đuôi .. 0.5 đầu
      float h = p.y;          // -0.5 bụng .. 0.5 lưng

      // Bảng màu cá chép đỏ-vàng
      vec3 belly  = vec3(1.00, 0.90, 0.62);
      vec3 side   = vec3(1.00, 0.68, 0.14);
      vec3 back   = vec3(0.55, 0.05, 0.02);
      vec3 finCol = vec3(0.92, 0.22, 0.05);
      vec3 finTip = vec3(1.00, 0.62, 0.20);

      vec3 body = mix(belly, side, smoothstep(-0.35, -0.05, h));
      body = mix(body, back, smoothstep(-0.02, 0.26, h));

      // Vảy trên thân (trừ đầu)
      float rim;
      float sc = scalePattern(vec2(d * 34., h * 26.), rim);
      float onBody = smoothstep(0.36, 0.30, d) * smoothstep(-0.34, -0.26, d);
      body *= 1. + sc * 0.22 * onBody;
      body = mix(body, back * 0.55, rim * 0.55 * onBody);
      body *= 0.92 + 0.16 * hash21(floor(vec2(d * 34., h * 26.)));

      // Đầu: mịn, đỏ hơn ở mõm
      body = mix(body, vec3(0.95, 0.35, 0.10), smoothstep(0.38, 0.5, d) * 0.6);

      // Vây: đuôi, vây lưng, vây bụng — đỏ cam có tia vây
      float tail   = smoothstep(-0.28, -0.36, d);
      float dorsal = smoothstep(0.34, 0.40, h) * smoothstep(0.30, -0.10, d);
      float lower  = smoothstep(-0.36, -0.44, h);
      finMask = clamp(tail + dorsal + lower, 0., 1.);
      float rays = 0.75 + 0.25 * sin((h * 2.2 + d) * 90.);
      vec3 fin = mix(finCol, finTip, smoothstep(-0.36, -0.5, d) + smoothstep(0.38, 0.5, h)) * rays;

      return mix(body, fin, finMask);
    }
  `;

  function makeCarpMaterial(objUniforms) {
    const objMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.25,
      side: THREE.DoubleSide
    });
    objMat.onBeforeCompile = shader => {
      shader.uniforms.uSpatialTexture = objUniforms.uSpatialTexture;
      shader.uniforms.uTextureSize = objUniforms.uTextureSize;
      shader.uniforms.uTime = objUniforms.uTime;
      shader.uniforms.uLengthRatio = objUniforms.uLengthRatio;
      shader.uniforms.uObjSize = objUniforms.uObjSize;

      shader.vertexShader = `
        uniform sampler2D uSpatialTexture;
        uniform vec2 uTextureSize;
        uniform float uTime;
        uniform float uLengthRatio;
        uniform vec3 uObjSize;
        varying vec3 vLocal;

        struct splineData {
          vec3 point;
          vec3 binormal;
          vec3 normal;
          vec3 tangent;
        };

        splineData getSplineData(float t){
          float step = 1. / uTextureSize.y;
          float halfStep = step * 0.5;
          splineData sd;
          sd.point    = texture2D(uSpatialTexture, vec2(t, step * 0. + halfStep)).rgb;
          sd.binormal = texture2D(uSpatialTexture, vec2(t, step * 1. + halfStep)).rgb;
          sd.normal   = texture2D(uSpatialTexture, vec2(t, step * 2. + halfStep)).rgb;
          sd.tangent  = texture2D(uSpatialTexture, vec2(t, step * 3. + halfStep)).rgb;
          return sd;
        }
      ` + shader.vertexShader;

      // Tính vị trí trên đường cong ở đầu main() (code gốc của pen)
      shader.vertexShader = shader.vertexShader.replace('void main() {', `void main() {
        vec3 pos = position;
        vLocal = position / uObjSize;

        float wStep = 1. / uTextureSize.x;
        float hWStep = wStep * 0.5;

        float d = pos.z / uObjSize.z;
        float t = fract((uTime * 0.1) + (d * uLengthRatio));
        float numPrev = floor(t / wStep);
        float numNext = numPrev + 1.;
        float tPrev = numPrev * wStep + hWStep;
        float tNext = numNext * wStep + hWStep;
        splineData splinePrev = getSplineData(tPrev);
        splineData splineNext = getSplineData(tNext);

        float f = (t - tPrev) / wStep;
        vec3 P = mix(splinePrev.point, splineNext.point, f);
        vec3 B = mix(splinePrev.binormal, splineNext.binormal, f);
        vec3 N = mix(splinePrev.normal, splineNext.normal, f);
        vec3 T = mix(splinePrev.tangent, splineNext.tangent, f);

        // Quẫy đuôi nhẹ (bổ sung)
        float tailW = pow(clamp(0.5 - d, 0., 1.), 2.);
        float sway = sin(d * 9. - uTime * 9.) * tailW * 0.03 * uObjSize.z;
      `);

      // Pháp tuyến đi theo khung đường cong để ánh sáng đúng
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = normalize(N * normal.x + B * normal.y + T * normal.z);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
      `);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        vec3 transformed = P + (N * (pos.x + sway)) + (B * pos.y);
      `);

      shader.fragmentShader = carpColorGLSL + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        float finMask;
        diffuseColor.rgb = carpColor(vLocal, finMask);
      `);
      // Vây hơi trong và tự phát sáng nhẹ khi đèn trời chiếu xuyên qua
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (0.08 + finMask * 0.22);
      `);
    };
    return objMat;
  }

  function buildCarp(objGeom) {
    // path
    let baseVector = new THREE.Vector3(40, 0, 0);
    let axis = new THREE.Vector3(0, 1, 0);
    let cPts = [];
    let cSegments = 6;
    let cStep = Math.PI * 2 / cSegments;
    for (let i = 0; i < cSegments; i++) {
      cPts.push(
        new THREE.Vector3().copy(baseVector)
          .applyAxisAngle(axis, cStep * i).setY(THREE.MathUtils.randFloat(-10, 10))
      );
    }
    let curve = new THREE.CatmullRomCurve3(cPts);
    curve.closed = true;

    let numPoints = 511;
    let cPoints = curve.getSpacedPoints(numPoints);
    let cObjects = curve.computeFrenetFrames(numPoints, true);

    // data texture (RGBA vì three r137+ bỏ RGBFormat)
    let data = [];
    const push = v => data.push(v.x, v.y, v.z, 1);
    cPoints.forEach(push);
    cObjects.binormals.forEach(push);
    cObjects.normals.forEach(push);
    cObjects.tangents.forEach(push);
    let tex = new THREE.DataTexture(new Float32Array(data), numPoints + 1, 4, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;

    objGeom.center();
    objGeom.rotateX(-Math.PI * 0.5);
    objGeom.scale(0.5, 0.5, 0.5);
    // STL chỉ có pháp tuyến theo mặt → gộp đỉnh để thân cá mịn
    objGeom.deleteAttribute('normal');
    objGeom = THREE.BufferGeometryUtils.mergeVertices(objGeom, 1e-3);
    objGeom.computeVertexNormals();

    let objBox = new THREE.Box3().setFromBufferAttribute(objGeom.getAttribute('position'));
    let objSize = new THREE.Vector3();
    objBox.getSize(objSize);

    let objUniforms = {
      uSpatialTexture: { value: tex },
      uTextureSize: { value: new THREE.Vector2(numPoints + 1, 4) },
      uTime: { value: 0 },
      uLengthRatio: { value: objSize.z / curve.cacheArcLengths[200] }, // more or less real length along the path
      uObjSize: { value: objSize } // length
    };
    oUs.push(objUniforms);

    let obj = new THREE.Mesh(objGeom, makeCarpMaterial(objUniforms));
    obj.frustumCulled = false;
    scene.add(obj);

    stage.classList.add('is-ready');
  }

  new THREE.STLLoader().load('fish.stl', buildCarp, undefined, () => stage.classList.add('is-ready'));

  // ------------------------------------------------------------ loop & resize
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scroll = 0; // 0..1, ScrollTrigger cập nhật
  window.carpScene = { setScroll: (v) => { scroll = v; } };

  let camDist = 80;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camDist = camera.aspect < 1 ? 80 * Math.min(1.6, 0.85 / camera.aspect) : 80;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  var clock = new THREE.Clock();
  let elapsed = 0;

  function frame() {
    elapsed += Math.min(clock.getDelta(), 0.05);
    mat.uniforms.uTime.value = elapsed;
    oUs.forEach(ou => { ou.uTime.value = elapsed; });

    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    const ang = pointer.sx * 0.35;
    camera.position.set(
      Math.sin(ang) * camDist,
      -25 - pointer.sy * 8 + scroll * 30,
      Math.cos(ang) * camDist - scroll * 25
    );
    camera.lookAt(0, scroll * 20, 0);
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    elapsed = 3.2;
    clock.getDelta = () => 0;
    const wait = setInterval(() => { if (oUs.length) { frame(); clearInterval(wait); } }, 200);
    window.addEventListener('resize', frame);
    frame();
    return;
  }

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) { clock.getDelta(); renderer.setAnimationLoop(frame); }
    else renderer.setAnimationLoop(null);
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (visible) { clock.getDelta(); renderer.setAnimationLoop(frame); }
  });
  renderer.setAnimationLoop(frame);
})();
