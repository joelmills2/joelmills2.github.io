import * as THREE from 'three'

// ---- Constants ----
const WORLD_BOUND = 90
const TRIGGER_RADIUS = 9
const COLL_HALF = 5.0

// ---- Scene ----
const canvas = document.getElementById('game-canvas')
canvas.setAttribute('tabindex', '0')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x9DD6F0)
scene.fog = new THREE.Fog(0x9DD6F0, 60, 160)

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 220)
camera.position.set(0, 6, -12)

// ---- Lighting ----
const ambient = new THREE.AmbientLight(0xffffff, 0.75)
scene.add(ambient)

const sun = new THREE.DirectionalLight(0xFFF5E0, 1.4)
sun.position.set(40, 70, 30)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 220
sun.shadow.camera.left = sun.shadow.camera.bottom = -100
sun.shadow.camera.right = sun.shadow.camera.top = 100
scene.add(sun)

// ---- Ground ----
const groundMat = new THREE.MeshLambertMaterial({ color: 0x7BC67E })
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ---- Stars (night mode) ----
const starVerts = []
for (let i = 0; i < 1200; i++) {
  // Sphere of stars around the origin, low enough to avoid fog
  const theta = Math.random() * Math.PI * 2
  const phi   = Math.random() * Math.PI * 0.5
  const r     = 60 + Math.random() * 20
  starVerts.push(r * Math.sin(phi) * Math.cos(theta), 18 + Math.random() * 45, r * Math.sin(phi) * Math.sin(theta))
}
const starGeo = new THREE.BufferGeometry()
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.8, sizeAttenuation: true }))
stars.visible = false
scene.add(stars)

// ---- Road materials ----
const roadMat = new THREE.MeshLambertMaterial({ color: 0x8A8A8A })
const markMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
const curbMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC })

function addRoad(cx, cz, width, length, rotY = 0) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, length), roadMat)
  r.position.set(cx, 0.01, cz); r.rotation.y = rotY; r.receiveShadow = true
  scene.add(r)
}
function addDashes(cx, cz, length, rotY = 0) {
  const n = Math.floor(length / 5)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5
    const dx = -Math.sin(rotY) * length * t
    const dz =  Math.cos(rotY) * length * t
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 2.0), markMat)
    d.position.set(cx + dx, 0.03, cz + dz); d.rotation.y = rotY
    scene.add(d)
  }
}
function addSidewalk(cx, cz, width, length, rotY = 0) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, length),
    new THREE.MeshLambertMaterial({ color: 0xD4C9B0 }))
  s.position.set(cx, 0.05, cz); s.rotation.y = rotY; s.receiveShadow = true
  scene.add(s)
}

// ---- Main N-S street ----
const ROAD_LEN = 170
addRoad(0, 0, 9, ROAD_LEN)
addDashes(0, 0, ROAD_LEN)
addSidewalk(-7, 0, 3.5, ROAD_LEN)
addSidewalk( 7, 0, 3.5, ROAD_LEN)
;[-8.8, 8.8].forEach(cx => {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, ROAD_LEN), curbMat)
  c.position.set(cx, 0.06, 0); scene.add(c)
})

// ---- Building definitions ----
const buildingDefs = [
  { id: 'about',      label: 'ABOUT',      x: -23, z: -38, color: 0xFF6B6B, hex: '#FF6B6B', rotY:  Math.PI / 2 },
  { id: 'education',  label: 'EDUCATION',  x:  23, z: -38, color: 0x98D8AA, hex: '#98D8AA', rotY: -Math.PI / 2 },
  { id: 'experience', label: 'EXPERIENCE', x: -23, z:   0, color: 0x4ECDC4, hex: '#4ECDC4', rotY:  Math.PI / 2 },
  { id: 'projects',   label: 'PROJECTS',   x:  23, z:   0, color: 0xFFB347, hex: '#FFB347', rotY: -Math.PI / 2 },
  { id: 'contact',    label: 'CONTACT',    x: -23, z:  38, color: 0xB0A8FF, hex: '#B0A8FF', rotY:  Math.PI / 2 },
  { id: 'travel',     label: 'TRAVEL',     x:  23, z:  38, color: 0xFF8B94, hex: '#FF8B94', rotY: -Math.PI / 2 },
]

buildingDefs.forEach(def => {
  const side = def.x < 0 ? -1 : 1
  addRoad(side * 15.5, def.z, 15, 4.5, Math.PI / 2)
})
;[-38, 0, 38].forEach(zRow => {
  addRoad(0, zRow, 50, 5, Math.PI / 2)
  addDashes(0, zRow, 50, Math.PI / 2)
})

// ---- Canvas sign texture ----
function makeSignTexture(label, bgHex) {
  const cv = document.createElement('canvas')
  cv.width = 512; cv.height = 128
  const ctx = cv.getContext('2d')
  function draw() {
    ctx.fillStyle = bgHex; ctx.fillRect(0, 0, 512, 128)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 6
    ctx.strokeRect(5, 5, 502, 118)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 56px "Syne", Impact, Arial, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6
    ctx.fillText(label, 256, 66)
  }
  draw()
  const tex = new THREE.CanvasTexture(cv)
  document.fonts.ready.then(() => { draw(); tex.needsUpdate = true })
  return tex
}

// ---- Build buildings ----
const buildings = []
const labelsEl = document.getElementById('labels')

buildingDefs.forEach(def => {
  const g = new THREE.Group()
  const bMat = new THREE.MeshLambertMaterial({ color: def.color })
  const rColor = new THREE.Color(def.color).multiplyScalar(0.68)

  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 11, 9), bMat)
  body.position.y = 5.5; body.castShadow = true; body.receiveShadow = true; g.add(body)

  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.65, 10.5),
    new THREE.MeshLambertMaterial({ color: rColor }))
  roof.position.y = 11.35; roof.castShadow = true; g.add(roof)

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.85, 0.12),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color).multiplyScalar(0.52) }))
  doorFrame.position.set(0, 1.93, 4.56); g.add(doorFrame)

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.3, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x6B4226 }))
  door.position.set(0, 1.65, 4.58); g.add(door)

  const winMat = new THREE.MeshLambertMaterial({ color: 0xB8DFF5, transparent: true, opacity: 0.85 })
  ;[[-2.9, 6.5, 4.56], [2.9, 6.5, 4.56]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(2, 2.1, 0.12), winMat)
    w.position.set(x, y, z); g.add(w)
  })

  const signMats = Array(6).fill(null).map((_, i) =>
    i === 4 ? new THREE.MeshBasicMaterial({ map: makeSignTexture(def.label, def.hex) })
            : new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color).multiplyScalar(0.6) })
  )
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.9, 0.25), signMats)
  sign.position.set(0, 8.5, 4.69); g.add(sign)

  g.position.set(def.x, 0, def.z); g.rotation.y = def.rotY
  scene.add(g)

  const labelEl = document.createElement('div')
  labelEl.className = 'building-label'; labelEl.textContent = def.label; labelEl.style.color = def.hex
  labelsEl.appendChild(labelEl)

  buildings.push({ id: def.id, x: def.x, z: def.z, hex: def.hex, labelEl, content: getSectionContent(def.id) })
})

// ---- Easter egg hint sign (north end of road) ----
;(() => {
  const g = new THREE.Group()
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6),
    new THREE.MeshLambertMaterial({ color: 0x777777 }))
  post.position.y = 2; post.castShadow = true; g.add(post)

  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 320, 240)
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 308, 228)
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 22px Impact, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('SECRET CODES', 160, 38)
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(20, 50); ctx.lineTo(300, 50); ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = '18px Arial, sans-serif'
  const hints = ['[H] honk', '[N] night', '[R] radio', '[Z] rain', 'spin to donut', 'type ZOOM / BOOM / SPIN']
  hints.forEach((h, i) => ctx.fillText(h, 160, 78 + i * 28))

  const board = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.8, 0.15),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }))
  board.position.set(0, 5.2, 0); g.add(board)
  g.position.set(3.5, 0, 74); scene.add(g)
})()

// ---- Trees ----
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
const topMats = [0x2D8B57, 0x3BA55C, 0x1F7A44].map(c => new THREE.MeshLambertMaterial({ color: c }))
function placeTree(x, z) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.3, 6), trunkMat)
  trunk.position.y = 1.15; trunk.castShadow = true; g.add(trunk)
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 0.6, 7, 5),
    topMats[Math.floor(Math.random() * topMats.length)])
  top.position.y = 3.3 + Math.random() * 0.4; top.castShadow = true; g.add(top)
  g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI * 2; scene.add(g)
}
let seed = 42
function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff }
for (let i = 0; i < 70; i++) {
  let tx, tz, tries = 0
  do {
    tx = (rand() - 0.5) * 200; tz = (rand() - 0.5) * 200; tries++
  } while (tries < 50 && (Math.abs(tx) < 14 || (Math.abs(tz) < 10 && Math.abs(tx) < 40) ||
    buildings.some(b => Math.sqrt((b.x - tx) ** 2 + (b.z - tz) ** 2) < 12)))
  if (tries < 50) placeTree(tx, tz)
}
for (let x = -80; x <= 80; x += 12 + rand() * 6) {
  placeTree(x + rand() * 4 - 2, -88 + rand() * 8)
  placeTree(x + rand() * 4 - 2,  88 + rand() * 8)
}

// ---- Lamp posts ----
const lampMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFFACC }) // BasicMaterial = always bright
function placeLamp(x, z) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampMat)
  pole.position.y = 3; pole.castShadow = true; g.add(pole)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), lampMat)
  arm.position.set(0.6, 6.06, 0); g.add(arm)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), bulbMat)
  bulb.position.set(1.1, 5.82, 0); g.add(bulb)
  g.position.set(x, 0, z); scene.add(g)
}
for (let z = -70; z <= 70; z += 18) { placeLamp(-9.5, z); placeLamp(9.5, z) }

// ---- Night mode ----
let isNight = false
function toggleNight(msg = null) {
  isNight = !isNight
  if (isNight) {
    scene.background.set(0x06091C)
    scene.fog.color.set(0x06091C)
    scene.fog.near = 250; scene.fog.far = 500  // effectively disable fog so stars show
    ambient.intensity = 0.08
    sun.intensity = 0.04
    groundMat.color.set(0x182A18)
    bulbMat.color.set(0xFFCC44)
    stars.visible = true
    playNightWhoosh(true)
    showToast(msg || 'NIGHT MODE', 2000)
  } else {
    scene.background.set(0x9DD6F0)
    scene.fog.color.set(0x9DD6F0)
    scene.fog.near = 60; scene.fog.far = 160
    ambient.intensity = 0.75
    sun.intensity = 1.4
    groundMat.color.set(0x7BC67E)
    bulbMat.color.set(0xFFFACC)
    stars.visible = false
    playNightWhoosh(false)
    showToast('GOOD MORNING', 1500)
  }
}

// ---- Rain ----
const rainDrops = []
let rainActive = false
let rainSoundNode = null

function initRain() {
  if (rainDrops.length) return
  const mat = new THREE.MeshBasicMaterial({ color: 0x88AACC, transparent: true, opacity: 0.55 })
  const geo = new THREE.CylinderGeometry(0.018, 0.018, 0.9, 4)
  for (let i = 0; i < 350; i++) {
    const d = new THREE.Mesh(geo, mat)
    d.visible = false; scene.add(d); rainDrops.push(d)
  }
}
function resetDrop(d) {
  d.position.set(car.x + (rand() - 0.5) * 50, 14 + rand() * 10, car.z + (rand() - 0.5) * 50)
}
function updateRain() {
  if (!rainActive) return
  rainDrops.forEach(d => {
    d.position.y -= 0.55; d.position.x += 0.01
    if (d.position.y < 0) resetDrop(d)
  })
}
function toggleRain() {
  rainActive = !rainActive
  initRain()
  if (rainActive) {
    rainDrops.forEach(d => { d.visible = true; resetDrop(d) })
    startRainSound(); showToast('RAIN MODE', 1500)
  } else {
    rainDrops.forEach(d => d.visible = false)
    stopRainSound(); showToast('CLEAR SKIES', 1500)
  }
}

// ---- Car ----
let carGroup = null
function createCar(hexColor) {
  if (carGroup) scene.remove(carGroup)
  const color = parseInt(hexColor)
  carGroup = new THREE.Group()
  const bMat = new THREE.MeshLambertMaterial({ color })
  const dMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  const gMat = new THREE.MeshLambertMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.75 })
  const rMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.78) })
  carGroup.userData.bodyMat = bMat
  carGroup.userData.roofMat = rMat

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4), bMat)
  body.position.y = 0.45; body.castShadow = true; carGroup.add(body)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 2.1), rMat)
  cabin.position.set(0, 1.02, -0.1); cabin.castShadow = true; carGroup.add(cabin)
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.12), gMat)
  ws.position.set(0, 1.02, 0.97); carGroup.add(ws)
  const rw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.12), gMat)
  rw.position.set(0, 1.02, -1.18); carGroup.add(rw)

  const hlM = new THREE.MeshLambertMaterial({ color: 0xFFFACC })
  carGroup.userData.headlights = []
  ;[[-0.72,0.5,2.02],[0.72,0.5,2.02]].forEach(([x,y,z]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.18,0.1), hlM.clone())
    h.position.set(x,y,z); carGroup.add(h); carGroup.userData.headlights.push(h)
  })
  const tlM = new THREE.MeshLambertMaterial({ color: 0xFF3333 })
  ;[[-0.72,0.5,-2.02],[0.72,0.5,-2.02]].forEach(([x,y,z]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.18,0.1), tlM)
    t.position.set(x,y,z); carGroup.add(t)
  })
  const wG = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10)
  ;[[-1.12,0.38,1.3],[1.12,0.38,1.3],[-1.12,0.38,-1.3],[1.12,0.38,-1.3]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wG, dMat)
    w.rotation.z = Math.PI / 2; w.position.set(x,y,z); w.castShadow = true; carGroup.add(w)
  })
  scene.add(carGroup)
  return carGroup
}

// ---- Truck ----
function createTruck(color) {
  if (carGroup) scene.remove(carGroup)
  carGroup = new THREE.Group()
  const bMat = new THREE.MeshLambertMaterial({ color })
  const dMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  const gMat = new THREE.MeshLambertMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.75 })
  const rMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.75) })
  const bedMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.58) })
  carGroup.userData.bodyMat = bMat; carGroup.userData.roofMat = rMat

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.75, 5.8), bMat)
  body.position.y = 0.52; body.castShadow = true; carGroup.add(body)

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 2.3), rMat)
  cab.position.set(0, 1.28, 1.3); cab.castShadow = true; carGroup.add(cab)

  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 0.12), gMat)
  ws.position.set(0, 1.28, 2.47); carGroup.add(ws)

  // Bed walls
  ;[[-1.25,1.05,2.6,0.12,0.65],[1.25,1.05,2.6,0.12,0.65]].forEach(([x,y,l,w]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.6,2.6), bedMat)
    wall.position.set(x,1.05,-1.2); carGroup.add(wall)
  })
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.7,0.6,0.12), bedMat)
  backWall.position.set(0,1.05,-2.5); carGroup.add(backWall)

  carGroup.userData.headlights = []
  const hlM = new THREE.MeshLambertMaterial({ color: 0xFFFACC })
  ;[[-0.95,0.6,2.93],[0.95,0.6,2.93]].forEach(([x,y,z]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.22,0.1), hlM.clone())
    h.position.set(x,y,z); carGroup.add(h); carGroup.userData.headlights.push(h)
  })
  const tlM = new THREE.MeshLambertMaterial({ color: 0xFF3333 })
  ;[[-0.95,0.6,-2.93],[0.95,0.6,-2.93]].forEach(([x,y,z]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.22,0.1), tlM)
    t.position.set(x,y,z); carGroup.add(t)
  })

  // 6 wheels
  const wG = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 10)
  ;[[-1.4,0.44,1.7],[1.4,0.44,1.7],[-1.4,0.44,-0.7],[1.4,0.44,-0.7],[-1.4,0.44,-1.6],[1.4,0.44,-1.6]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wG, dMat)
    w.rotation.z = Math.PI/2; w.position.set(x,y,z); w.castShadow = true; carGroup.add(w)
  })
  scene.add(carGroup); return carGroup
}

// ---- Motorcycle ----
function createMotorcycle(color) {
  if (carGroup) scene.remove(carGroup)
  carGroup = new THREE.Group()
  const bMat = new THREE.MeshLambertMaterial({ color })
  const dMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
  const cMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA })
  const gMat = new THREE.MeshLambertMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.75 })
  carGroup.userData.bodyMat = bMat; carGroup.userData.roofMat = bMat

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 2.3), bMat)
  frame.position.y = 0.72; frame.castShadow = true; carGroup.add(frame)

  // Tank
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.85), bMat)
  tank.position.set(0, 0.98, 0.12); carGroup.add(tank)

  // Fairing
  const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.55), bMat)
  fairing.position.set(0, 0.92, 1.1); fairing.castShadow = true; carGroup.add(fairing)

  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.1), gMat)
  ws.position.set(0, 1.2, 1.22); carGroup.add(ws)

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.85),
    new THREE.MeshLambertMaterial({ color: 0x222222 }))
  seat.position.set(0, 0.9, -0.55); carGroup.add(seat)

  // Handlebars
  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.06), cMat)
  bars.position.set(0, 1.05, 0.88); carGroup.add(bars)

  // Fork
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.65, 0.07), cMat)
  fork.position.set(0, 0.5, 1.05); carGroup.add(fork)


  // Headlight
  carGroup.userData.headlights = []
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xFFFACC }))
  hl.position.set(0, 0.88, 1.4); carGroup.add(hl); carGroup.userData.headlights.push(hl)

  // Wheels (large, thin)
  const wG = new THREE.CylinderGeometry(0.5, 0.5, 0.17, 14)
  ;[[0,0.5,1.1],[0,0.5,-1.0]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wG, dMat)
    w.rotation.z = Math.PI/2; w.position.set(x,y,z); w.castShadow = true; carGroup.add(w)
  })
  scene.add(carGroup); return carGroup
}

// ---- Vehicle dispatcher ----
function createVehicle(colorHex, shape) {
  const c = parseInt(colorHex)
  if (shape === 'truck') {
    car.maxSpeed = 0.14; car.boostSpeed = 0.26; car.accel = 0.010; car.friction = 0.89; car.turnSpeed = 0.030
    return createTruck(c)
  }
  if (shape === 'moto') {
    car.maxSpeed = 0.24; car.boostSpeed = 0.48; car.accel = 0.018; car.friction = 0.92; car.turnSpeed = 0.056
    return createMotorcycle(c)
  }
  car.maxSpeed = 0.18; car.boostSpeed = 0.36; car.accel = 0.013; car.friction = 0.91; car.turnSpeed = 0.042
  return createCar(c)
}

// ---- Car state ----
const car = { x: 0, z: -72, angle: 0, speed: 0, maxSpeed: 0.18, boostSpeed: 0.36, accel: 0.013, friction: 0.91, turnSpeed: 0.042 }

// ---- App state ----
const state = {
  started: false, sectionOpen: false, nearBuilding: null,
  selectedColor: '0x6C63FF', selectedShape: 'car', proximityFrames: 0, escCooldownUntil: 0,
  donutCount: 0, donutCooldown: 0, turboMode: false,
  nightTriggered: false, secretBuffer: '',
  shakeFrames: 0, donutWobble: 0, cameraSpin: null,
}

// ---- Audio system ----
let audioCtx = null
let engOsc1 = null, engOsc2 = null, engFilter = null, engGain = null
let lastBoostState = false, collCooldown = 0
let radioTimeout = null

function initAudio() {
  if (audioCtx) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()

  // Two detuned oscillators for rich engine rumble
  engOsc1 = audioCtx.createOscillator()
  engOsc2 = audioCtx.createOscillator()
  engFilter = audioCtx.createBiquadFilter()
  engGain   = audioCtx.createGain()

  engOsc1.type = 'sawtooth'; engOsc2.type = 'sawtooth'
  engOsc1.frequency.value = 38; engOsc2.frequency.value = 40.6
  engFilter.type = 'lowpass'; engFilter.frequency.value = 160; engFilter.Q.value = 1.8
  engGain.gain.value = 0

  engOsc1.connect(engFilter); engOsc2.connect(engFilter)
  engFilter.connect(engGain); engGain.connect(audioCtx.destination)
  engOsc1.start(); engOsc2.start()
}

function updateEngine(speed, maxSpeed, boosting, accelerating) {
  if (!audioCtx) return
  const t = audioCtx.currentTime
  const r = Math.min(1, Math.abs(speed) / maxSpeed)
  const freq = 36 + r * 68 + (boosting ? 15 : 0)
  // Quiet cruise when moving, slightly louder when actively accelerating
  const cruiseGain = Math.abs(speed) > 0.005 ? 0.001 + r * 0.0015 : 0
  const accelGain  = accelerating ? 0.012 + r * 0.02 : 0
  const gain = Math.max(cruiseGain, accelGain)
  engOsc1.frequency.setTargetAtTime(freq, t, 0.12)
  engOsc2.frequency.setTargetAtTime(freq * 1.022, t, 0.12)
  engGain.gain.setTargetAtTime(gain, t, 0.1)
  engFilter.frequency.setTargetAtTime(boosting ? 260 : 165, t, 0.15)
}

function playBoostSound() {
  if (!audioCtx) return
  // Engine surge: sawtooth rev from idle up through low-pass filter
  const osc = audioCtx.createOscillator()
  const f   = audioCtx.createBiquadFilter()
  const g   = audioCtx.createGain()
  osc.connect(f); f.connect(g); g.connect(audioCtx.destination)
  osc.type = 'sawtooth'
  f.type = 'lowpass'; f.frequency.value = 280; f.Q.value = 1.5
  const t = audioCtx.currentTime
  osc.frequency.setValueAtTime(55, t)
  osc.frequency.exponentialRampToValueAtTime(160, t + 0.35)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.07, t + 0.04)
  g.gain.setValueAtTime(0.07, t + 0.25)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.start(t); osc.stop(t + 0.4)
}

function playHonkSound() {
  if (!audioCtx) return
  // Two quick beeps — classic car double-honk
  const t = audioCtx.currentTime
  ;[0, 0.22].forEach((delay, i) => {
    const dur = i === 0 ? 0.16 : 0.13
    ;[400, 510].forEach(freq => {
      const osc = audioCtx.createOscillator()
      const f   = audioCtx.createBiquadFilter()
      const g   = audioCtx.createGain()
      osc.connect(f); f.connect(g); g.connect(audioCtx.destination)
      osc.type = 'triangle'
      f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 1.2
      osc.frequency.value = freq
      const st = t + delay
      g.gain.setValueAtTime(0, st)
      g.gain.linearRampToValueAtTime(0.14, st + 0.012)
      g.gain.setValueAtTime(0.14, st + dur - 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, st + dur)
      osc.start(st); osc.stop(st + dur)
    })
  })
}

function playChime() {
  if (!audioCtx) return
  const t = audioCtx.currentTime
  ;[523, 659, 784].forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const g   = audioCtx.createGain()
    osc.connect(g); g.connect(audioCtx.destination)
    osc.type = 'sine'; osc.frequency.value = freq
    const st = t + i * 0.09
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.18, st + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.45)
    osc.start(st); osc.stop(st + 0.45)
  })
}

function playCollisionSound() {
  if (!audioCtx || collCooldown > 0) return
  collCooldown = 35
  const size = Math.floor(audioCtx.sampleRate * 0.13)
  const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size)
  const src = audioCtx.createBufferSource()
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 350
  const g = audioCtx.createGain()
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(audioCtx.destination)
  const t = audioCtx.currentTime
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13)
  src.start(t)
}

function playScreech() {
  if (!audioCtx) return
  const size = Math.floor(audioCtx.sampleRate * 0.75)
  const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  const src = audioCtx.createBufferSource()
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 2.5
  const g = audioCtx.createGain()
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(audioCtx.destination)
  const t = audioCtx.currentTime
  g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.75)
  src.start(t)
}

function playNightWhoosh(goingDark) {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const g   = audioCtx.createGain()
  osc.connect(g); g.connect(audioCtx.destination)
  osc.type = 'sine'
  const t = audioCtx.currentTime
  osc.frequency.setValueAtTime(goingDark ? 800 : 200, t)
  osc.frequency.exponentialRampToValueAtTime(goingDark ? 80 : 900, t + 1.4)
  g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  osc.start(t); osc.stop(t + 1.4)
}

// ---- Radio system ----
let radioAudio = null
let radioStations = []
let radioIdx = -1
let radioOn = false

const FALLBACK_STATIONS = [
  { name: 'Groove Salad',     url_resolved: 'https://ice1.somafm.com/groovesalad-256-mp3' },
  { name: 'Indie Pop Rocks',  url_resolved: 'https://ice1.somafm.com/indiepop-256-mp3' },
  { name: 'Radio Paradise',   url_resolved: 'https://stream.radioparadise.com/mp3-128' },
  { name: 'Space Station',    url_resolved: 'https://ice1.somafm.com/spacestation-128-mp3' },
  { name: 'DEF CON Radio',    url_resolved: 'https://ice1.somafm.com/defcon-256-mp3' },
]

async function fetchLocalStations() {
  try {
    const geoRes = await fetch('https://ip-api.com/json/?fields=countryCode')
    const { countryCode } = await geoRes.json()
    const url = `https://de1.api.radio-browser.info/json/stations/bycountrycode/${countryCode}?` +
      new URLSearchParams({ order: 'votes', reverse: 'true', limit: '12', hidebroken: 'true' })
    const res = await fetch(url)
    const stations = await res.json()
    return stations.filter(s => s.url_resolved && s.url_resolved.startsWith('http'))
  } catch (e) { return [] }
}

function playRadioStation(idx) {
  const station = radioStations[idx]
  if (radioAudio) { radioAudio.pause(); radioAudio.src = ''; radioAudio = null }
  radioAudio = new Audio()
  radioAudio.src = station.url_resolved
  radioAudio.volume = 0.55
  radioAudio.play()
    .then(() => showToast(`📻  ${station.name}`, 3000))
    .catch(() => {
      showToast('SIGNAL LOST — NEXT CHANNEL...', 1500)
      setTimeout(() => { radioIdx = (radioIdx + 1) % radioStations.length; playRadioStation(radioIdx) }, 2000)
    })
}

async function cycleRadio() {
  if (!radioOn) {
    radioOn = true; radioIdx = -1
    showToast('SCANNING FOR LOCAL RADIO...', 2200)
    const local = await fetchLocalStations()
    radioStations = local.length >= 3 ? local : FALLBACK_STATIONS
    radioIdx = 0; playRadioStation(0)
    return
  }
  const next = (radioIdx + 1) % (radioStations.length + 1)
  if (next === radioStations.length) {
    radioOn = false
    if (radioAudio) { radioAudio.pause(); radioAudio.src = ''; radioAudio = null }
    showToast('RADIO OFF', 1200)
  } else {
    radioIdx = next; playRadioStation(radioIdx)
  }
}

function startRainSound() {
  if (!audioCtx || rainSoundNode) return
  const size = audioCtx.sampleRate * 3
  const buf = audioCtx.createBuffer(1, size, audioCtx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  const src = audioCtx.createBufferSource()
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5500; f.Q.value = 0.4
  const g = audioCtx.createGain(); g.gain.value = 0.07
  src.buffer = buf; src.loop = true
  src.connect(f); f.connect(g); g.connect(audioCtx.destination)
  src.start(); rainSoundNode = { src, gain: g }
}
function stopRainSound() {
  if (!rainSoundNode) return
  try { rainSoundNode.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5) } catch(e) {}
  setTimeout(() => { try { rainSoundNode.src.stop() } catch(e) {} rainSoundNode = null }, 600)
}

// ---- Toast ----
const toast = document.createElement('div')
toast.style.cssText = `position:fixed;top:42%;left:50%;transform:translate(-50%,-50%);
  background:rgba(20,20,20,0.88);color:#fff;padding:0.9rem 2.2rem;border-radius:100px;
  font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;letter-spacing:0.1em;
  pointer-events:none;z-index:300;opacity:0;transition:opacity 0.25s;text-align:center;white-space:nowrap;`
document.body.appendChild(toast)
let toastTimer = null
function showToast(msg, ms = 2500) {
  toast.textContent = msg; toast.style.opacity = '1'
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.style.opacity = '0' }, ms)
}

function screenFlash(bg) {
  const fl = document.createElement('div')
  fl.style.cssText = `position:fixed;inset:0;z-index:299;pointer-events:none;background:${bg};opacity:0.5;`
  document.body.appendChild(fl)
  let op = 0.5
  const iv = setInterval(() => {
    op -= 0.05; fl.style.opacity = Math.max(0, op).toString()
    if (op <= 0) { clearInterval(iv); fl.remove() }
  }, 40)
}

// ---- Secret word easter eggs ----
let zoomTimer = null
function activateZoom() {
  if (zoomTimer) return
  car.maxSpeed *= 2.5; car.boostSpeed *= 2.5
  screenFlash('#FFD93D')
  showToast('ZOOM ZOOM!', 2000)
  zoomTimer = setTimeout(() => {
    car.maxSpeed /= 2.5; car.boostSpeed /= 2.5
    zoomTimer = null; showToast('BACK TO NORMAL', 1500)
  }, 6000)
}

function activateBoom() {
  // Brief blackout then big flash
  const blackout = document.createElement('div')
  blackout.style.cssText = 'position:fixed;inset:0;z-index:400;pointer-events:none;background:#000;opacity:0;'
  document.body.appendChild(blackout)
  blackout.style.opacity = '1'
  setTimeout(() => {
    blackout.style.transition = 'opacity 0.05s'
    blackout.style.opacity = '0'
    screenFlash('radial-gradient(circle at center,#FFF5AA,#FF8800,#FF3300)')
    setTimeout(() => blackout.remove(), 500)
  }, 120)
  state.shakeFrames = 40
  showToast('BOOM!', 2000)
  if (audioCtx) {
    // Deep boom + crackle
    ;[0, 0.08].forEach((delay, i) => {
      const osc = audioCtx.createOscillator(), g = audioCtx.createGain()
      osc.connect(g); g.connect(audioCtx.destination)
      osc.type = 'sine'
      const t = audioCtx.currentTime + delay
      osc.frequency.setValueAtTime(i === 0 ? 150 : 80, t)
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.6)
      g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t); osc.stop(t + 0.6)
    })
  }
}

function activateSpin() {
  if (typeof state.cameraSpin === 'number') return // already spinning
  state.cameraSpin = 0
  showToast('WOAH!', 1000)
  if (audioCtx) {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain()
    osc.connect(g); g.connect(audioCtx.destination)
    osc.type = 'sine'
    const t = audioCtx.currentTime
    osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(80, t + 1.2)
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
    osc.start(t); osc.stop(t + 1.2)
  }
}

// ---- Input ----
const keys = {}
window.addEventListener('keydown', e => {
  keys[e.key] = true

  // Secret word detector runs first — before any returns — so M/N/R still reach the buffer
  if (state.started && e.key.length === 1) {
    state.secretBuffer = (state.secretBuffer + e.key.toLowerCase()).slice(-8)
    if      (state.secretBuffer.includes('zoom')) { state.secretBuffer = ''; activateZoom() }
    else if (state.secretBuffer.includes('boom')) { state.secretBuffer = ''; activateBoom() }
    else if (state.secretBuffer.includes('spin')) { state.secretBuffer = ''; activateSpin() }
  }

  if (e.key === 'Escape' && state.sectionOpen) {
    document.getElementById('section-overlay').classList.remove('active')
    state.sectionOpen = false; state.proximityFrames = 0
    state.escCooldownUntil = Date.now() + 3000; canvas.focus(); return
  }
  if ((e.key === 'Enter' || e.key === 'e' || e.key === 'E') && state.nearBuilding && !state.sectionOpen) {
    openSection(state.nearBuilding); return
  }
  if ((e.key === 'h' || e.key === 'H') && state.started) {
    triggerHonk()
    // Don't return — allow 'h' to also reach secret buffer
  }
  if ((e.key === 'n' || e.key === 'N') && state.started) { toggleNight(); return }
  if ((e.key === 'r' || e.key === 'R') && state.started) { cycleRadio(); return }
  if ((e.key === 'z' || e.key === 'Z') && state.started) { toggleRain(); return }

})
window.addEventListener('keyup', e => { keys[e.key] = false })
canvas.addEventListener('click', () => canvas.focus())

// ---- Honk ----
function triggerHonk() {
  if (!state.started || state.sectionOpen) return
  if (carGroup && carGroup.userData.headlights) {
    carGroup.userData.headlights.forEach(h => {
      h.material.color.set(0xFFFF00)
      setTimeout(() => h.material.color.set(0xFFFACC), 380)
    })
  }
  playHonkSound()
  showToast('BEEP BEEP!', 1200)
}

// ---- Donut ----
function triggerDonut() {
  state.donutCooldown = 160; state.donutCount = 0
  screenFlash('#FFB347')
  showToast('DONUT!', 1800)
  state.donutWobble = 35
  playScreech()
}

// ---- Section open/close ----
function openSection(building) {
  state.sectionOpen = true; state.proximityFrames = 0
  playChime()
  const ov = document.getElementById('section-overlay')
  ov.style.setProperty('--accent', building.hex)
  document.getElementById('overlay-content').innerHTML = building.content
  ov.classList.add('active')
}
document.getElementById('close-overlay').addEventListener('click', () => {
  document.getElementById('section-overlay').classList.remove('active')
  state.sectionOpen = false; state.proximityFrames = 0
  state.escCooldownUntil = Date.now() + 3000; canvas.focus()
})

// ---- Label positioning ----
function updateLabels() {
  buildings.forEach(b => {
    const wp = new THREE.Vector3(b.x, 14, b.z); wp.project(camera)
    if (wp.z > 1) { b.labelEl.style.display = 'none'; return }
    const sx = (wp.x * 0.5 + 0.5) * window.innerWidth
    const sy = (-wp.y * 0.5 + 0.5) * window.innerHeight
    const dist = Math.sqrt((b.x - car.x) ** 2 + (b.z - car.z) ** 2)
    if (dist > 55) { b.labelEl.style.display = 'none'; return }
    b.labelEl.style.display = 'block'; b.labelEl.style.left = sx + 'px'; b.labelEl.style.top = sy + 'px'
    b.labelEl.style.opacity = Math.min(1, Math.max(0, 1 - (dist - 10) / 30)).toString()
  })
}

// ---- Collision ----
function applyCollision() {
  if (collCooldown > 0) collCooldown--
  buildings.forEach(b => {
    const dx = car.x - b.x, dz = car.z - b.z
    if (Math.abs(dx) < COLL_HALF && Math.abs(dz) < COLL_HALF) {
      const ox = COLL_HALF - Math.abs(dx), oz = COLL_HALF - Math.abs(dz)
      if (ox < oz) car.x += Math.sign(dx) * (ox + 0.05)
      else         car.z += Math.sign(dz) * (oz + 0.05)
      if (Math.abs(car.speed) > 0.04) playCollisionSound()
      car.speed *= 0.15
    }
  })
}

// ---- Camera ----
const camPos = new THREE.Vector3(0, 6, -12)

// ---- Update ----
function update() {
  if (!state.started || state.sectionOpen) return

  const boost = keys[' '] === true
  const top   = boost ? car.boostSpeed : car.maxSpeed

  if (keys['ArrowUp'] || keys['w'] || keys['W'])
    car.speed = Math.min(top, car.speed + car.accel)
  else if (keys['ArrowDown'] || keys['s'] || keys['S'])
    car.speed = car.speed > 0.01 ? Math.max(0, car.speed - car.accel * 2.5) : Math.max(-car.maxSpeed * 0.45, car.speed - car.accel)
  else { car.speed *= car.friction; if (Math.abs(car.speed) < 0.001) car.speed = 0 }

  const sf   = Math.min(1, Math.abs(car.speed) / (car.maxSpeed * 0.4))
  const turn = car.turnSpeed * Math.max(0.15, sf) * Math.sign(car.speed)
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) car.angle += turn
  if (keys['ArrowRight'] || keys['d'] || keys['D']) car.angle -= turn

  car.x += Math.sin(car.angle) * car.speed
  car.z += Math.cos(car.angle) * car.speed
  car.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, car.x))
  car.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, car.z))

  applyCollision()
  if (carGroup) { carGroup.position.set(car.x, 0, car.z); carGroup.rotation.y = car.angle }

  // Camera follow (with optional 360 spin)
  const cd = 9.5, ch = 5.2
  if (typeof state.cameraSpin === 'number') {
    state.cameraSpin += 0.065
    if (state.cameraSpin >= Math.PI * 2) state.cameraSpin = null
  }
  const spinOffset = typeof state.cameraSpin === 'number' ? state.cameraSpin : 0
  const camAngle = car.angle + spinOffset
  camPos.x += (car.x - Math.sin(camAngle) * cd - camPos.x) * (spinOffset ? 0.15 : 0.07)
  camPos.y += (ch - camPos.y) * 0.07
  camPos.z += (car.z - Math.cos(camAngle) * cd - camPos.z) * (spinOffset ? 0.15 : 0.07)
  camera.position.copy(camPos)
  camera.lookAt(car.x + Math.sin(car.angle) * 3, 1.2, car.z + Math.cos(car.angle) * 3)

  // Engine sound
  const isAccelerating = keys['ArrowUp'] || keys['w'] || keys['W'] || boost
  const isBoosting = boost && Math.abs(car.speed) > car.maxSpeed * 0.4
  if (isBoosting && !lastBoostState) playBoostSound()
  lastBoostState = isBoosting
  updateEngine(car.speed, car.maxSpeed, isBoosting, isAccelerating)

  // Camera shake (BOOM easter egg)
  if (state.shakeFrames > 0) {
    camPos.x += (Math.random() - 0.5) * 0.4
    camPos.y += (Math.random() - 0.5) * 0.2
    state.shakeFrames--
  }

  // FOV
  let targetFov = isBoosting ? 72 : 62
  if (state.donutWobble > 0) { targetFov += Math.sin(state.donutWobble * 0.45) * 10; state.donutWobble-- }
  camera.fov += (targetFov - camera.fov) * 0.1
  camera.updateProjectionMatrix()

  // Donut detection — count frames turning hard at speed
  if (state.donutCooldown > 0) state.donutCooldown--
  const turning = keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ArrowRight'] || keys['d'] || keys['D']
  if (Math.abs(car.speed) > car.maxSpeed * 0.55 && turning) {
    state.donutCount++
  } else {
    state.donutCount = Math.max(0, state.donutCount - 2)
  }
  if (state.donutCount > 160 && state.donutCooldown === 0) triggerDonut()

  // Rain
  updateRain()

  // End of road easter egg
  if (Math.abs(car.z) > 76 && !state.nightTriggered) {
    state.nightTriggered = true
    showToast('TURN AROUND... NOTHING TO SEE HERE', 3000)
    screenFlash('#333333')
  }

  // Proximity auto-open
  let nearest = null, nearDist = TRIGGER_RADIUS
  buildings.forEach(b => {
    const d = Math.sqrt((b.x - car.x) ** 2 + (b.z - car.z) ** 2)
    if (d < nearDist) { nearDist = d; nearest = b }
  })
  state.nearBuilding = nearest

  if (nearest) {
    state.proximityFrames++
    if (state.proximityFrames >= 60 && Date.now() > state.escCooldownUntil) openSection(nearest)
  } else {
    state.proximityFrames = 0
  }

  const prompt = document.getElementById('entry-prompt')
  if (nearest && state.proximityFrames < 60) {
    prompt.textContent = `PRESS ENTER — ${nearest.id.toUpperCase()}`
    prompt.style.opacity = '1'
  } else {
    prompt.style.opacity = '0'
  }
}

// ---- Render loop ----
function render() { requestAnimationFrame(render); update(); updateLabels(); renderer.render(scene, camera) }

// ---- Car select ----
document.querySelectorAll('.car-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.car-option').forEach(o => o.classList.remove('selected'))
    el.classList.add('selected'); state.selectedColor = el.dataset.color
  })
})
document.querySelectorAll('.shape-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.shape-option').forEach(o => o.classList.remove('selected'))
    el.classList.add('selected'); state.selectedShape = el.dataset.shape
  })
})
document.getElementById('start-btn').addEventListener('click', () => {
  createVehicle(state.selectedColor, state.selectedShape)
  document.getElementById('car-select').style.display = 'none'
  document.getElementById('hud').style.display = 'flex'
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768
  if (isMobile) document.getElementById('touch-controls').style.display = 'flex'
  state.started = true; initAudio(); canvas.focus()
})

// ---- Touch controls ----
const touchKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
document.querySelectorAll('.dpad-btn').forEach(btn => {
  const dir = ['dpad-up','dpad-down','dpad-left','dpad-right'].find(c => btn.classList.contains(c))
  if (!dir) return
  const key = touchKeys[dir.replace('dpad-','')]
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true }, { passive: false })
  btn.addEventListener('touchend',   e => { e.preventDefault(); keys[key] = false }, { passive: false })
  btn.addEventListener('mousedown',  () => keys[key] = true)
  btn.addEventListener('mouseup',    () => keys[key] = false)
})
document.getElementById('boost-btn').addEventListener('touchstart', e => { e.preventDefault(); keys[' '] = true }, { passive: false })
document.getElementById('boost-btn').addEventListener('touchend',   e => { e.preventDefault(); keys[' '] = false }, { passive: false })
document.getElementById('boost-btn').addEventListener('mousedown',  () => keys[' '] = true)
document.getElementById('boost-btn').addEventListener('mouseup',    () => keys[' '] = false)
document.getElementById('menu-btn').addEventListener('click', () => {
  car.x = 0; car.z = -72; car.angle = 0; car.speed = 0
  state.started = false; state.sectionOpen = false; state.proximityFrames = 0
  document.getElementById('section-overlay').classList.remove('active')
  document.getElementById('hud').style.display = 'none'
  document.getElementById('touch-controls').style.display = 'none'
  document.getElementById('car-select').style.display = 'flex'
  if (isNight) toggleNight()
  if (rainActive) toggleRain()
  if (radioOn) { radioOn = false; if (radioAudio) { radioAudio.pause(); radioAudio.src = ''; radioAudio = null } }
  state.nightTriggered = false
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight)
})

render()

// ============================================================
// SECTION CONTENT
// ============================================================

function getSectionContent(id) {
  switch (id) {
    case 'about':      return aboutContent()
    case 'experience': return experienceContent()
    case 'projects':   return projectsContent()
    case 'education':  return educationContent()
    case 'travel':     return travelContent()
    case 'contact':    return contactContent()
    default:           return '<div class="section-content"><h1>Coming Soon</h1></div>'
  }
}

function aboutContent() {
  return `
    <div class="section-content">
      <div class="about-header">
        <img src="assets/img/joel_mills_headshot.jpeg" alt="Joel Mills" class="about-photo">
        <div>
          <div class="about-name">Joel Mills</div>
          <div class="about-tagline">Software Engineer · Startup Founder</div>
        </div>
      </div>
      <h1>ABOUT</h1>
      <p>I'm a Software Engineer at Lyft passionate about developing altruistic software. I'm particularly interested in autonomous systems, robotics, healthcare, and building at scale. I also love working for and founding startups.</p>
      <p>When I'm not building, I'm playing guitar, going to the gym, running, travelling, hiking, watching sports, cooking, spending time with family, reading fiction, skiing, playing chess, or doing many of these things at the same time.</p>
      <div class="skills-grid">
        <span class="skill-tag">Python</span><span class="skill-tag">Go</span>
        <span class="skill-tag">Java</span><span class="skill-tag">TypeScript</span>
        <span class="skill-tag">C#</span><span class="skill-tag">SQL</span>
        <span class="skill-tag">React</span><span class="skill-tag">Flask</span>
        <span class="skill-tag">AWS</span><span class="skill-tag">Docker</span>
        <span class="skill-tag">PostgreSQL</span><span class="skill-tag">MongoDB</span>
        <span class="skill-tag">Git</span><span class="skill-tag">MCP</span>
        <span class="skill-tag">REST APIs</span><span class="skill-tag">gRPC</span>
      </div>
    </div>`
}

function experienceContent() {
  return `
    <div class="section-content">
      <h1>EXPERIENCE</h1>
      <div class="exp-item">
        <div class="exp-header"><h3>Software Engineer</h3><span class="exp-date">July 2026 - Present</span></div>
        <p class="exp-company">Lyft · Full-Time · Toronto, ON</p>
        <ul><li>Return offer to the same team.</li></ul>
      </div>
      <div class="exp-item">
        <div class="exp-header"><h3>Software Engineer Intern</h3><span class="exp-date">June - September 2025</span></div>
        <p class="exp-company">Lyft · Toronto, ON</p>
        <ul>
          <li>Improved customer reliability by developing an automated service to clean up stuck rides.</li>
          <li>Designed a sparse DynamoDB GSI that reduces query range from 5B base items to ~50k indexed items.</li>
          <li>Unlocked real-time observability into all active rides for the first time at Lyft through the GSI and a new gRPC endpoint.</li>
          <li>Recognized for exceeding T3 (entry-level) expectations and meeting the majority of T4 expectations.</li>
        </ul>
      </div>
      <div class="exp-item">
        <div class="exp-header"><h3>Software Engineer Intern - AI Deployment and Evaluation Lab</h3><span class="exp-date">May - August 2024</span></div>
        <p class="exp-company">Trillium Health Partners · Toronto, ON</p>
        <ul>
          <li>Developed an open-source AI monitoring dashboard using Python, Flask, and React for models across three hospitals.</li>
          <li>Built an ETL pipeline processing 5,000 monthly records using MongoDB, PostgreSQL, and RESTful APIs.</li>
          <li>Used Prefect to orchestrate workflows with built-in error handling and automated retry logic.</li>
          <li>Containerized the application with Docker, ensuring consistent deployment across environments.</li>
        </ul>
      </div>

      <div class="exp-item">
        <div class="exp-header"><h3>Frontend Developer Intern</h3><span class="exp-date">May - June 2023</span></div>
        <p class="exp-company">SueApp · Tel Aviv, Israel</p>
        <ul>
          <li>Led a team of 4 interns using React.js and TypeScript to develop a website for filing online claims in 5 weeks.</li>
          <li>Managed tasks and timelines using Jira to ensure smooth collaboration and on-time project delivery.</li>
          <li>Wrote onboarding documentation covering Git workflow and best practices for future intern teams.</li>
        </ul>
      </div>
    </div>`
}

function projectsContent() {
  return `
    <div class="section-content">
      <h1>PROJECTS</h1>
      <div class="project-card">
        <h3>PatchLine</h3>
        <div class="project-links"><span style="color:#888;font-size:0.82rem">Python · MCP · LLMs</span></div>
        <ul>
          <li>Built a plugin-based framework integrating LLM vulnerability detectors and fixers via a standardized abstraction layer.</li>
          <li>Improved code patch quality using structured, constraint-driven prompt design over naive pipelines.</li>
        </ul>
      </div>
      <div class="project-card">
        <h3>Guava - Grocery Savings Startup</h3>
        <div class="project-links"><a href="https://www.downloadguava.com/" target="_blank">App</a></div>
        <ul>
          <li>Built full-stack grocery savings app with Python backend and React and React Native frontends.</li>
          <li>Designed serverless AWS architecture with Lambda, DynamoDB, S3, and API Gateway for scalability.</li>
          <li>Secured $2,000 grant through AWS Build accelerator program and pitched to potential investors.</li>
          <li>Reached the final interview of the ERA accelerator in New York City.</li>
        </ul>
        <div class="video-embed"><iframe src="https://www.youtube.com/embed/rWE4T2By5rM" allowfullscreen></iframe></div>
      </div>
      <div class="project-card">
        <h3>Queen's AutoDrive - Perception</h3>
        <div class="project-links"><span style="color:#888;font-size:0.82rem">Python · ROS2 · MATLAB</span></div>
        <ul>
          <li>Developed LiDAR-Camera calibration software for autonomous vehicles as part of a 7-person team.</li>
          <li>Implemented sensor fusion algorithms to improve perception accuracy and object detection using Python and ROS2.</li>
        </ul>
      </div>
    </div>`
}

function educationContent() {
  return `
    <div class="section-content">
      <h1>EDUCATION</h1>
      <div class="edu-item">
        <h3>Bachelor of Computing, Honours with Distinction - Computer Science</h3>
        <p class="edu-school">Queen's University, Kingston, Ontario</p>
        <p class="edu-date">September 2022 - May 2026</p>
        <p class="edu-gpa">Cumulative GPA: 4.28 / 4.30</p>
      </div>
      <div class="edu-item">
        <h3>Exchange Semester - Computer Science</h3>
        <p class="edu-school">University of New South Wales (UNSW), Sydney, Australia</p>
        <p class="edu-date">January - May 2025</p>
        <p class="edu-gpa">Grade: High Distinction</p>
      </div>
      <div class="awards-section">
        <h2>AWARDS</h2>
        <div class="award-item"><h4>Dean's Award of Excellence</h4><p>2023 and 2024 · Queen's University</p></div>
        <div class="award-item"><h4>Dean's Honour List with Distinction</h4><p>Top 3% of students in program · 2023, 2024, 2025 · Queen's University</p></div>
        <div class="award-item"><h4>Principal's Scholarship</h4><p>Top 5% of competitive admission average · 2022 · Queen's University</p></div>
      </div>
    </div>`
}

function travelContent() {
  const p = 'assets/img/Travel'
  const nz = `${p}/New%20Zealand`, au = `${p}/Australia`,
        ca = `${p}/California`, sea = `${p}/Southeast%20Asia`, ski = `${p}/Canada`
  return `
    <div class="section-content">
      <h1>TRAVEL</h1>
      <div class="photo-section">
        <p class="photo-section-label">New Zealand</p>
        <p class="travel-desc">The most amazing mountains, lakes, and people. Did some beautiful hiking and went skydiving for the first time!</p>
        <div class="photo-strip">
          <img src="${nz}/IMG_7931.JPG" alt=""><img src="${nz}/IMG_7935.JPG" alt="">
          <img src="${nz}/P1020341.jpeg" alt=""><img src="${nz}/P1020510.jpeg" alt="">
          <img src="${nz}/P1020771.jpeg" alt=""><img src="${nz}/P1020784.jpeg" alt="">
          <img src="${nz}/IMG_5355.JPG" alt=""><img src="${nz}/IMG_4321.JPG" alt="">
        </div>
      </div>
      <div class="photo-section">
        <p class="photo-section-label">Southeast Asia</p>
        <p class="travel-desc">Went to Indonesia, Singapore, Vietnam, and Thailand. Each place taught me so much about the different cultures in Southeast Asia. Highlights included the Ha Giang Loop, chilling with Elephants in Chiang Mai, and riding motorcycles in Bali.</p>
        <div class="photo-strip">
          <img src="${sea}/IMG_4924.JPG" alt=""><img src="${sea}/IMG_5886.JPG" alt="">
          <img src="${sea}/P1030578.jpeg" alt=""><img src="${sea}/P1030730.jpeg" alt="">
          <img src="${sea}/P1030860.jpeg" alt=""><img src="${sea}/20250329_114831_F2C1AF.jpeg" alt="">
          <img src="${sea}/20250518_170041_1FE630.jpeg" alt=""><img src="${sea}/20250519_185141_19F88D.jpeg" alt="">
        </div>
      </div>
      <div class="photo-section">
        <p class="photo-section-label">Australia</p>
        <p class="travel-desc">Studied abroad at UNSW Sydney with my best friends. The most amazing semester and time of my life. Australia has gorgeous nature and scenery, kind people, and the best weather. I want to go back!</p>
        <div class="photo-strip">
          <img src="${au}/IMG_4764.JPG" alt=""><img src="${au}/IMG_8234.jpeg" alt="">
          <img src="${au}/P1020091.jpeg" alt=""><img src="${au}/P1020147.jpeg" alt="">
          <img src="${au}/P1020189.jpeg" alt=""><img src="${au}/P1020205.jpeg" alt="">
        </div>
      </div>
      <div class="photo-section">
        <p class="photo-section-label">California</p>
        <p class="travel-desc">Road tripped the coast in a truck and visited a bunch of National Parks. Went for some intense hikes and backpacking.</p>
        <div class="photo-strip">
          <img src="${ca}/IMG_0964.jpeg" alt=""><img src="${ca}/IMG_1049.jpeg" alt="">
          <img src="${ca}/IMG_1068.jpg" alt=""><img src="${ca}/IMG_1143.jpg" alt="">
          <img src="${ca}/IMG_1202.jpg" alt=""><img src="${ca}/IMG_1216.jpg" alt="">
          <img src="${ca}/IMG_1624.JPG" alt=""><img src="${ca}/IMG_4316.jpeg" alt="">
          <img src="${ca}/IMG_9044.jpeg" alt="">
        </div>
      </div>
      <div class="photo-section">
        <p class="photo-section-label">Skiing</p>
        <p class="travel-desc">Been to mountains in British Columbia, Vermont, and Montreal. Hoping to ski in Europe soon!</p>
        <div class="photo-strip">
          <img src="${ski}/IMG_0892.jpeg" alt=""><img src="${ski}/IMG_1181.jpeg" alt="">
          <img src="${ski}/IMG_4645.jpeg" alt=""><img src="${ski}/IMG_4742.jpeg" alt="">
        </div>
      </div>
    </div>`
}

function contactContent() {
  return `
    <div class="section-content">
      <h1>CONTACT</h1>
      <p class="contact-intro">Let's get in touch!</p>
      <div class="contact-links">
        <a href="mailto:joelarimills@gmail.com" class="contact-link"><span class="contact-icon">✉</span>joelarimills@gmail.com</a>
        <a href="https://github.com/joelmills2" target="_blank" class="contact-link"><span class="contact-icon">⌥</span>github.com/joelmills2</a>
        <a href="https://www.linkedin.com/in/joelmills-" target="_blank" class="contact-link"><span class="contact-icon">in</span>linkedin.com/in/joelmills-</a>
      </div>
      <div class="resume-row">
        <p>Here's my resume</p>
        <a href="assets/resume_swe.pdf" target="_blank" class="resume-btn">DOWNLOAD RESUME</a>
      </div>
    </div>`
}
