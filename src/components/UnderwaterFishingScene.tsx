import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpeditionState, Venue } from '../types';
import amazonRootEdge from '../assets/underwater/amazon-root-edge-v1.webp';
import { underwaterFishByEncounterId, type UnderwaterFishDefinition, type UnderwaterFishFrame } from '../data/underwaterFish';
import { getEncounterArtwork } from '../data/encounterArtwork';
import { getCurrentEncounter, getFightProfile, getInteractionCue, getPressureFeedback, hasLostFish } from '../game/engine';
import { getAnglingCue, getAnglingWindow } from '../game/angling';
import { getSkillFishingCue } from '../game/skillFishing';
import { getDecodedLiveFishView } from '../game/fishMotion';
import { getUnderwaterFishPose, getUnderwaterFishFrameWidth, getUnderwaterLine, getUnderwaterMeshPoint, getUnderwaterTexturePoint, interpolateUnderwaterPose, type UnderwaterPose } from '../game/underwaterMotion';

type Point = { x: number; y: number };
type Images = { backdrop: HTMLImageElement | null; side: HTMLImageElement | null; oblique: HTMLImageElement | null; turn: HTMLImageElement | null };
type Transition = { from: UnderwaterPose; to: UnderwaterPose; start: number; duration: number };
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

/** One continuous texture mesh, including the head: no separately clipped
 * rectangular body pieces, hinge gaps, or independent mouth attachment. */
function drawTriangle(ctx: CanvasRenderingContext2D, image: HTMLImageElement, src: Point[], dst: Point[]) {
  const [a, b, c] = src;
  const [p, q, r] = dst;
  const denominator = a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y);
  if (Math.abs(denominator) < .0001) return;
  const xx = (p.x * (b.y - c.y) + q.x * (c.y - a.y) + r.x * (a.y - b.y)) / denominator;
  const xy = (p.y * (b.y - c.y) + q.y * (c.y - a.y) + r.y * (a.y - b.y)) / denominator;
  const yx = (p.x * (c.x - b.x) + q.x * (a.x - c.x) + r.x * (b.x - a.x)) / denominator;
  const yy = (p.y * (c.x - b.x) + q.y * (a.x - c.x) + r.y * (b.x - a.x)) / denominator;
  const tx = (p.x * (b.x * c.y - c.x * b.y) + q.x * (c.x * a.y - a.x * c.y) + r.x * (a.x * b.y - b.x * a.y)) / denominator;
  const ty = (p.y * (b.x * c.y - c.x * b.y) + q.y * (c.x * a.y - a.x * c.y) + r.y * (a.x * b.y - b.x * a.y)) / denominator;
  const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 };
  // A subpixel overlap closes raster seams; the opaque silhouette remains the
  // image alpha, not an invented rectangular fish mask.
  const expanded = dst.map(point => {
    const dx = point.x - center.x, dy = point.y - center.y;
    const scale = 1 + .38 / Math.max(1, Math.hypot(dx, dy));
    return { x: center.x + dx * scale, y: center.y + dy * scale };
  });
  ctx.save();
  ctx.beginPath(); ctx.moveTo(expanded[0].x, expanded[0].y);
  ctx.lineTo(expanded[1].x, expanded[1].y); ctx.lineTo(expanded[2].x, expanded[2].y);
  ctx.closePath(); ctx.clip();
  ctx.transform(xx, xy, yx, yy, tx, ty);
  ctx.drawImage(image, 0, 0); ctx.restore();
}

function drawMesh(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number,
  mouthX: number, mouthY: number, pose: UnderwaterPose, strength: number, sourceRect?: UnderwaterFishFrame['sourceRect']) {
  const columns = 26, rows = 3;
  const point = (u: number, v: number) => getUnderwaterMeshPoint(u, v, width, height, mouthX, mouthY, pose, strength);
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const uv = [{ x: column / columns, y: row / rows }, { x: (column + 1) / columns, y: row / rows },
        { x: (column + 1) / columns, y: (row + 1) / rows }, { x: column / columns, y: (row + 1) / rows }];
      const source = uv.map(p => getUnderwaterTexturePoint({ sourceRect }, p.x, p.y, image.naturalWidth, image.naturalHeight));
      const target = uv.map(p => point(p.x, p.y));
      drawTriangle(ctx, image, [source[0], source[1], source[2]], [target[0], target[1], target[2]]);
      drawTriangle(ctx, image, [source[0], source[2], source[3]], [target[0], target[2], target[3]]);
    }
  }
}

function coverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, focus = .5) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  ctx.drawImage(image, (width - w) * clamp(focus, 0, 1), (height - h) / 2, w, h);
}

function fallbackBodyPath(fish: UnderwaterFishDefinition) {
  if (fish.shape === 'flatfish') return 'M98 50Q78 3 44 6Q14 9 8 50Q18 92 49 94Q81 88 98 50Z';
  if (fish.shape === 'catfish') return 'M98 50Q88 25 69 30Q44 32 10 43L2 28L7 50L2 72L10 57Q45 72 74 70Q93 67 98 50Z';
  if (fish.shape === 'sturgeon') return 'M98 50L81 38Q67 20 25 40L4 20L10 48L1 70L25 59Q57 79 78 65Z';
  if (fish.shape === 'elongate') return 'M98 50Q84 24 66 28Q43 26 13 40L2 24L7 50L2 76L13 60Q58 77 78 70Q92 64 98 50Z';
  if (fish.shape === 'deep-bodied') return 'M98 50Q83 5 54 12Q31 10 13 40L1 21L7 50L1 79L13 61Q41 93 64 88Q88 81 98 50Z';
  if (fish.shape === 'goby') return 'M98 50Q90 26 73 29Q46 24 17 41L3 29Q-1 50 3 71L17 61Q59 75 78 69Q92 64 98 50Z';
  return 'M98 50Q77 18 53 24Q29 21 13 40L1 21L7 50L1 79L13 61Q38 83 64 75Q88 69 98 50Z';
}

function drawFallbackFish(ctx: CanvasRenderingContext2D, fish: UnderwaterFishDefinition, width: number, height: number, pose: UnderwaterPose) {
  ctx.save(); ctx.scale(pose.facing < 0 ? -1 : 1, 1); ctx.translate(-width * .98, -height * .50); ctx.scale(width / 100, height / 100);
  const sheen = ctx.createLinearGradient(0, 15, 0, 90);
  sheen.addColorStop(0, fish.back); sheen.addColorStop(.48, fish.color); sheen.addColorStop(.87, fish.belly);
  const body = new Path2D(fallbackBodyPath(fish));
  ctx.fillStyle = sheen; ctx.fill(body); ctx.strokeStyle = 'rgba(21,38,31,.6)'; ctx.lineWidth = .7; ctx.stroke(body);
  ctx.save(); ctx.clip(body);
  if (fish.marking === 'spots') {
    ctx.fillStyle = 'rgba(24,42,33,.48)';
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(19 + i * 2.73, 26 + (i * 17 % 43), 1.6, 1.9, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (fish.marking === 'bars') {
    ctx.fillStyle = 'rgba(31,48,31,.36)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(22 + i * 9, 10); ctx.lineTo(26 + i * 9, 92); ctx.lineTo(29 + i * 9, 92); ctx.lineTo(27 + i * 9, 10); ctx.fill(); }
  } else if (fish.marking === 'stripe') {
    ctx.strokeStyle = 'rgba(28,47,38,.60)'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(15, 50); ctx.quadraticCurveTo(54, 44, 88, 49); ctx.stroke();
  } else if (fish.marking === 'scutes') {
    ctx.strokeStyle = 'rgba(221,221,182,.56)'; ctx.lineWidth = 1;
    for (let i = 0; i < 11; i++) { const x = 20 + i * 5.5; ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x + 2.5, 33); ctx.lineTo(x + 5, 38); ctx.stroke(); }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(39,54,42,.64)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(82, 38); ctx.quadraticCurveTo(77, 49, 84, 67); ctx.stroke();
  ctx.fillStyle = '#161f18'; ctx.beginPath(); ctx.ellipse(90, 43, 1.7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9d8b3'; ctx.beginPath(); ctx.ellipse(89.5, 42.4, .48, .64, 0, 0, Math.PI * 2); ctx.fill();
  if (fish.barbels) { ctx.strokeStyle = fish.color; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(96, 55); ctx.quadraticCurveTo(94, 76, 74, 82); ctx.moveTo(95, 54); ctx.quadraticCurveTo(83, 60, 74, 70); ctx.stroke(); }
  ctx.restore();
}

function drawFish(ctx: CanvasRenderingContext2D, images: Images, pose: UnderwaterPose, width: number, height: number, fish: UnderwaterFishDefinition) {
  const view = getDecodedLiveFishView(pose, { side: !!images.side, oblique: !!images.oblique, turn: !!images.turn });
  const frameWidth = getUnderwaterFishFrameWidth(pose, width, height);
  const frameHeight = frameWidth / (fish.side?.aspectRatio ?? fish.aspectRatio);
  const mouth = { x: width * pose.x / 100, y: height * pose.y / 100 };
  ctx.save(); ctx.translate(mouth.x, mouth.y); ctx.rotate(pose.pitch);
  const drawView = (image: HTMLImageElement | null, opacity: number, art: UnderwaterFishFrame | undefined, mirror: number, strength: number) => {
    if (!image || !art || opacity <= .001) return;
    const w = frameWidth * art.widthScale, h = w / art.aspectRatio;
    ctx.save(); ctx.globalAlpha = opacity * .97; ctx.scale(mirror, 1);
    drawMesh(ctx, image, w, h, art.mouthX, art.mouthY, pose, strength, art.sourceRect); ctx.restore();
  };
  drawView(images.side, view.sideOpacity, fish.side, view.sideScaleX, 1);
  drawView(images.oblique, view.obliqueOpacity, fish.oblique, view.obliqueScaleX, .45);
  drawView(images.turn, view.turnOpacity, fish.turn, 1, .15);
  if (view.fallback) drawFallbackFish(ctx, fish, frameWidth, frameHeight, pose);
  ctx.restore();
}

type WaterTone = 'river' | 'marine' | 'cold';
type CoverKind = 'roots' | 'reeds' | 'kelp' | 'rocks' | 'reef' | 'grass';
function drawCoverEdge(ctx: CanvasRenderingContext2D, width: number, height: number, side: 'left' | 'right', kind: CoverKind) {
  ctx.save(); ctx.translate(side === 'left' ? 0 : width, 0); ctx.scale(side === 'left' ? 1 : -1, 1);
  const extent = Math.min(width * .13, height * .32);
  if (kind === 'roots') {
    ctx.strokeStyle = 'rgba(44,44,29,.46)'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(5, extent * .055);
    ctx.beginPath(); ctx.moveTo(-extent * .1, height * .11); ctx.bezierCurveTo(extent * .50, height * .3, extent * .14, height * .73, extent * .32, height); ctx.stroke();
    ctx.lineWidth *= .48;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(extent * .27, height * (.34 + i * .14)); ctx.quadraticCurveTo(extent * .72, height * (.40 + i * .14), extent * (.94 - i * .10), height * (.5 + i * .13)); ctx.stroke(); }
  } else if (kind === 'rocks' || kind === 'reef') {
    for (let i = 0; i < 4; i++) { ctx.fillStyle = kind === 'reef' ? `rgba(${87 + i * 6},${86 + i * 3},${64 + i * 4},.43)` : 'rgba(38,53,51,.48)';
      ctx.beginPath(); ctx.ellipse(extent * (i * .17), height * (.88 + i * .024), extent * (.38 - i * .045), height * (.13 - i * .018), -.25, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.strokeStyle = kind === 'kelp' ? 'rgba(70,74,40,.40)' : 'rgba(46,66,39,.36)';
    ctx.lineWidth = kind === 'kelp' ? Math.max(3, extent * .045) : Math.max(1.8, extent * .022);
    for (let i = 0; i < 7; i++) { const x = extent * (i / 9); ctx.beginPath(); ctx.moveTo(x, height);
      ctx.bezierCurveTo(x + extent * .13, height * .80, x - extent * .09, height * .65, x + extent * .13, height * (kind === 'grass' ? .77 : .44 + (i % 3) * .09)); ctx.stroke(); }
  }
  ctx.restore();
}
function drawScene(ctx: CanvasRenderingContext2D, images: Images, pose: UnderwaterPose, width: number, height: number, fish: UnderwaterFishDefinition,
  tone: WaterTone, tint: string | undefined, focus: number, cover: { side: 'left' | 'right' | null; kind: CoverKind }) {
  ctx.clearRect(0, 0, width, height);
  const base = ctx.createLinearGradient(0, 0, 0, height);
  const palette = tone === 'marine' ? ['#699eac', '#316b79', '#102e3d'] : tone === 'cold' ? ['#8aa5ad', '#406575', '#172e3c'] : ['#789d73', '#49674c', '#142b22'];
  base.addColorStop(0, palette[0]); base.addColorStop(.28, palette[1]); base.addColorStop(1, palette[2]);
  ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
  if (images.backdrop) coverImage(ctx, images.backdrop, width, height, focus);
  if (!pose.lost) {
    drawFish(ctx, images, pose, width, height, fish);
    const line = getUnderwaterLine(pose, width, height);
    if (line) {
      ctx.beginPath(); ctx.moveTo(line.start.x, line.start.y);
      ctx.quadraticCurveTo(line.control.x, line.control.y, line.end.x, line.end.y);
      ctx.strokeStyle = pose.load > .82 ? 'rgba(230,194,113,.88)' : 'rgba(224,235,214,.74)';
      ctx.lineWidth = Math.max(1, width / 1100); ctx.stroke();
    }
  }
  // Water is also in front of the fish: depth tint, light fall-off, particles
  // and soft foreground vegetation establish a submerged viewing plane.
  const water = ctx.createLinearGradient(0, 0, 0, height);
  const waterRgb = tone === 'river' ? '32,82,54' : tone === 'marine' ? '27,78,99' : '34,61,80';
  water.addColorStop(0, `rgba(${waterRgb},.03)`); water.addColorStop(.55, `rgba(${waterRgb},.12)`); water.addColorStop(1, `rgba(${waterRgb},.32)`);
  ctx.fillStyle = water; ctx.fillRect(0, 0, width, height);
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height); }
  for (let i = 0; i < 34; i++) {
    const x = ((i * .371 + pose.clock * .0008) % 1) * width;
    const y = ((i * .617 - pose.clock * .001 + 100) % 1) * height;
    ctx.fillStyle = `rgba(204,220,177,${.08 + (i % 4) * .024})`;
    ctx.beginPath(); ctx.arc(x, y, i % 7 === 0 ? 1.7 : .8, 0, Math.PI * 2); ctx.fill();
  }
  if (cover.side) drawCoverEdge(ctx, width, height, cover.side, cover.kind);
  if (pose.surface && !pose.lost) {
    const x = width * pose.x / 100, y = height * .12;
    ctx.strokeStyle = 'rgba(217,236,190,.38)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(x, y, width * .042, height * .018, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

/** Rendering-only camera. rAF fills the interval between persisted 250 ms
 * samples; it never advances an interaction, record, or simulation clock. */
export function UnderwaterFishingScene({ state, venue, paused, engaged = false, ready = true, habitatSrc, waterTone, habitatTint, habitatFocus = .5 }: {
  state: ExpeditionState; venue: Venue; paused: boolean; engaged?: boolean; ready?: boolean; habitatSrc?: string; waterTone?: WaterTone; habitatTint?: string; habitatFocus?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fish = underwaterFishByEncounterId[state.encounterId ?? ''] ?? underwaterFishByEncounterId['peacock-bass'];
  const habitatSource = habitatSrc ?? (venue.id === 'amazon' ? amazonRootEdge : undefined);
  const habitat = venue.habitats.find(habitat => habitat.id === state.zoneId);
  const structure = `${habitat?.plant ?? ''} ${habitat?.cue ?? ''}`.toLowerCase();
  const coverKind: CoverKind = /kelp/.test(structure) ? 'kelp' : /coral|reef/.test(structure) ? 'reef' : /roots|forest|trunk|wood/.test(structure) ? 'roots'
    : /seagrass|eelgrass|grass flat/.test(structure) ? 'grass' : /reed|papyrus|rice|lotus/.test(structure) ? 'reeds' : 'rocks';
  const coverSide = habitat?.position === 'left' ? 'left' : habitat?.position === 'right' ? 'right' : null;
  const tone: WaterTone = waterTone ?? (['florida-bay', 'great-barrier-reef', 'seto-inland-sea', 'yellow-river-delta', 'galapagos'].includes(venue.id) ? 'marine' : ['alaska-kelp', 'baikal'].includes(venue.id) ? 'cold' : 'river');
  const pose = useMemo(() => getUnderwaterFishPose(state, venue), [state, venue]);
  const displayed = useRef(pose);
  const transition = useRef<Transition>({ from: pose, to: pose, start: 0, duration: 0 });
  const identity = useRef(`${state.venueId}:${state.encounterId}:${state.castAttempts}:${state.expeditionNumber}`);
  const frozen = useRef(paused || !ready);
  const invalidate = useRef<() => void>(() => {});
  const reducedMotion = useRef(false);
  const previousBeat = useRef(pose.clock);
  const previousLost = useRef(pose.lost);
  const sceneSize = useRef({ width: 100, height: 100 });
  const [canvasAvailable, setCanvasAvailable] = useState(true);

  useEffect(() => {
    const key = `${state.venueId}:${state.encounterId}:${state.castAttempts}:${state.expeditionNumber}`;
    const reset = identity.current !== key || pose.clock < previousBeat.current || previousLost.current && !pose.lost;
    const jumped = Math.abs(pose.clock - previousBeat.current) > 1;
    identity.current = key; previousBeat.current = pose.clock; previousLost.current = pose.lost;
    frozen.current = paused || !ready;
    if (pose.lost || pose.resolved) displayed.current = { ...displayed.current, lost: pose.lost, resolved: pose.resolved };
    if (reset || reducedMotion.current) {
      displayed.current = pose;
      transition.current = { from: pose, to: pose, start: performance.now(), duration: 0 };
    } else if (!frozen.current) {
      const destination = getUnderwaterFishPose(state, venue, displayed.current, sceneSize.current);
      transition.current = { from: displayed.current, to: destination, start: performance.now(), duration: jumped ? 280 : 250 };
    }
    invalidate.current();
  }, [pose, state.anglingBeat, state.castAttempts, state.encounterId, state.expeditionNumber, state.venueId, paused, ready]);

  useEffect(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext('2d');
    if (!context) { setCanvasAvailable(false); return; }
    setCanvasAvailable(true);
    let disposed = false, frame = 0, width = 1, height = 1;
    const images: Images = { backdrop: null, side: null, oblique: null, turn: null };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = media.matches;
    const paint = (now: number) => {
      frame = 0;
      if (disposed) return;
      const flight = transition.current;
      const fraction = flight.duration === 0 ? 1 : clamp((now - flight.start) / flight.duration, 0, 1);
      if (!frozen.current && !document.hidden) displayed.current = reducedMotion.current ? flight.to : interpolateUnderwaterPose(flight.from, flight.to, fraction);
      const current = displayed.current;
      drawScene(context, images, current, width, height, fish, tone, habitatTint, habitatFocus, { side: coverSide, kind: coverKind });
      container.dataset.mouthX = current.x.toFixed(3); container.dataset.mouthY = current.y.toFixed(3);
      const shown = getDecodedLiveFishView(current, { side: !!images.side, oblique: !!images.oblique, turn: !!images.turn });
      container.dataset.displayedView = `${shown.artworkView}${shown.fallback ? '-fallback' : ''}`;
      container.dataset.facing = current.facing.toFixed(3);
      if (fraction < 1 && !frozen.current && !reducedMotion.current && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(paint); };
    invalidate.current = schedule;
    const resize = () => {
      const box = container.getBoundingClientRect();
      width = Math.max(1, box.width); height = Math.max(1, box.height);
      sceneSize.current = { width, height };
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.imageSmoothingEnabled = true;
      schedule();
    };
    const load = (key: keyof Images, source: string) => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => { if (!disposed && image.naturalWidth > 0) { images[key] = image; schedule(); } };
      image.onerror = () => { if (!disposed) { images[key] = null; schedule(); } };
      image.src = source;
      return image;
    };
    const pending = [
      ...(habitatSource ? [load('backdrop', habitatSource)] : []),
      ...(fish.side ? [load('side', fish.side.src)] : []),
      ...(fish.oblique ? [load('oblique', fish.oblique.src)] : []),
      ...(fish.turn ? [load('turn', fish.turn.src)] : []),
    ];
    const onMotionPreference = () => {
      reducedMotion.current = media.matches;
      if (media.matches && !frozen.current) displayed.current = transition.current.to;
      schedule();
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame); frame = 0;
      } else {
        // Resume the remaining display interpolation, never use hidden wall
        // time to invent movement or skip a fish reaction.
        const target = transition.current.to;
        transition.current = { from: displayed.current, to: target, start: performance.now(), duration: 250 };
        schedule();
      }
    };
    const observer = new ResizeObserver(resize); observer.observe(container);
    media.addEventListener('change', onMotionPreference); document.addEventListener('visibilitychange', onVisibility);
    resize();
    return () => {
      disposed = true; if (frame) cancelAnimationFrame(frame);
      observer.disconnect(); media.removeEventListener('change', onMotionPreference); document.removeEventListener('visibilitychange', onVisibility);
      for (const image of pending) { image.onload = null; image.onerror = null; }
      invalidate.current = () => {};
    };
  }, [fish, habitatSource, tone, habitatTint, habitatFocus, coverSide, coverKind]);

  const encounter = getCurrentEncounter(state);
  const skill = getSkillFishingCue(state, venue);
  const angling = skill ?? getAnglingWindow(state, venue);
  const profile = getFightProfile(state);
  const lost = hasLostFish(state);
  const phase = lost ? 'lost' : state.lineResolved ? 'landed' : !ready ? 'ready' : state.interactionProgress >= 78 ? 'approach' : 'fighting';
  const cue = !lost && !state.lineResolved ? skill ? skill.remaining <= 3 ? `Next: ${skill.next.label.toLowerCase()} · ${skill.next.instruction}` : null
    : angling ? getAnglingCue(angling as NonNullable<ReturnType<typeof getAnglingWindow>>) : getInteractionCue(state) : null;
  const pressure = getPressureFeedback(state);
  const artwork = state.lineResolved ? getEncounterArtwork(state, venue) : null;
  const displayedProgress = state.lineResolved ? 100 : Math.min(99, Math.max(0, Math.round(state.interactionProgress)));
  const label = lost ? 'The fish escaped · reset for another cast' : state.lineResolved ? 'Alongside · choose careful handling'
    : !ready ? 'Fish hooked · start when you are ready' : angling?.instruction ?? (state.fightPhase === 'run' ? 'Release through the run' : 'Hold for measured recovery');
  return <div ref={containerRef} className={`fishing-scene fishing-scene--underwater ${paused ? 'fishing-scene--paused' : ''} ${engaged && !paused ? 'is-engaged' : ''}`}
    data-underwater-phase={phase} data-species={fish.id} data-motion-source="saved-encounter" data-fish-family={fish.behavior}
    data-cover-side={coverSide ?? 'center'} data-rod-side={state.rodSide} data-steering={skill?.needsRodSide ? state.rodSide === skill.requiredRodSide ? 'away-from-cover' : 'toward-cover' : 'open-water'}
    data-mouth-x={pose.x} data-mouth-y={pose.y} data-behavior={angling?.id ?? state.fightPhase} data-beat={pose.clock}
    data-line-visible={!lost && !state.lineResolved} data-pressure={state.lineTension > pressure.safeMax ? 'strained' : 'controlled'}
    style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#203e2b', backgroundImage: state.lineResolved ? `url(${venue.habitatImage})` : habitatSource ? `url(${habitatSource})` : undefined, backgroundSize: 'cover', backgroundPosition: `${habitatFocus * 100}% center` }}>
    <canvas ref={canvasRef} className="underwater-fight-canvas" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}/>
    {!canvasAvailable && !lost && <div className="underwater-canvas-fallback" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      {!state.lineResolved && <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d={`M${pose.rodSide === 'left' ? 27 : pose.rodSide === 'right' ? 41 : 34} -3Q${((pose.rodSide === 'left' ? 27 : pose.rodSide === 'right' ? 41 : 34) + pose.x) / 2 - 7.5 * (1 - pose.load)} ${(-3 + pose.y) / 2 + 9 * (1 - pose.load)} ${pose.x} ${pose.y}`} stroke="rgba(224,235,214,.8)" strokeWidth=".16" fill="none"/></svg>}
      <div style={{ position: 'absolute', left: `${pose.x}%`, top: `${pose.y}%`, width: '20%', aspectRatio: fish.side?.aspectRatio ?? fish.aspectRatio,
        transform: 'translate(-98%, -50%)', opacity: .85 }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '98% 50%', transform: `scaleX(${pose.facing < 0 ? -1 : 1})` }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d={fallbackBodyPath(fish)} fill={fish.color}/><circle cx="90" cy="43" r="2" fill="#132921"/></svg>
          {fish.side && !fish.side.sourceRect && <img src={fish.side.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/>} 
        </div>
      </div>
    </div>}
    <div className="scene-caption underwater-scene-caption"><small>{venue.shortTitle} · {angling?.label ?? profile.label}</small><strong>{label}</strong>
      <span>{displayedProgress}% recovered{state.assistMode ? ' · Untimed' : ''}{paused && !state.lineResolved ? ' · Paused' : ''}</span>
      {!canvasAvailable && <span>Simplified rendering · controls unchanged</span>}
      {cue && ready && <span className="angling-scene-cue">{paused ? 'Paused · ' : ''}{cue}</span>}</div>
    <div className="angling-habitat-label underwater-view-label">Underwater learning view · visibility enhanced</div>
    {skill?.needsRodSide && !state.lineResolved && !lost && <div className="underwater-cover-cue">{skill.coverSide === 'left' ? 'Left' : 'Right'} cover · rod {skill.requiredRodSide}</div>}
    {artwork && encounter && <figure className={`landed-reveal encounter-artwork encounter-artwork--${artwork.purpose}`}><img src={artwork.src} alt={artwork.alt} decoding="async" style={{ objectPosition: artwork.objectPosition }}/><figcaption>{encounter.name}<small>{artwork.caption} · choose your response next</small></figcaption></figure>}
  </div>;
}
