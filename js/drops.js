import * as THREE from 'three';
import { createSwimBear } from './bear.js';
import { createDogHouse, createFetchToy } from './house.js';

// Droplet island: a thin clear acrylic sheet. Water drops fall on it one by one
// and splat into the puddle shapes of the droplet photo; the swim bear walks
// about on the sheet and dodges each drop before it lands. Once every drop has
// fallen, the sheet shows the photo's layout. Entering the island again replays it.

// Puddle outlines traced from the droplet photo (u, v in 0–1, v = 0 at the top).
const SHAPES = [[[0.7349,0.9143],[0.7253,0.9019],[0.706,0.8941],[0.6554,0.8988],[0.6289,0.8988],[0.6145,0.9034],[0.5928,0.9174],[0.5831,0.9393],[0.5855,0.9439],[0.6024,0.9517],[0.6482,0.9502],[0.6819,0.9579],[0.7108,0.9579],[0.7205,0.9548],[0.7325,0.9455],[0.7325,0.9346],[0.7373,0.9268]],[[0.0916,0.7975],[0.0771,0.8084],[0.0723,0.8178],[0.0723,0.8255],[0.0819,0.838],[0.094,0.8458],[0.1084,0.8505],[0.1349,0.8489],[0.1518,0.8396],[0.159,0.8287],[0.159,0.8178],[0.1518,0.8084],[0.1301,0.7975]],[[0.1831,0.7897],[0.1855,0.8053],[0.2048,0.8193],[0.212,0.8209],[0.2434,0.8209],[0.2675,0.8146],[0.2795,0.8037],[0.2747,0.7928],[0.2554,0.7819],[0.2289,0.7757],[0.2096,0.7757],[0.2048,0.7788],[0.1976,0.7788],[0.188,0.7835]],[[0.6916,0.8474],[0.6819,0.8396],[0.6602,0.8302],[0.5952,0.8271],[0.5711,0.8162],[0.5373,0.8084],[0.5229,0.8006],[0.506,0.7819],[0.494,0.7741],[0.4795,0.7695],[0.4578,0.7679],[0.4048,0.7788],[0.3277,0.7726],[0.3157,0.7757],[0.306,0.7819],[0.3012,0.7897],[0.3036,0.7991],[0.3205,0.8178],[0.3205,0.8349],[0.3108,0.8427],[0.3012,0.8458],[0.2361,0.8442],[0.1759,0.8614],[0.1084,0.8972],[0.1036,0.9097],[0.1108,0.9206],[0.1349,0.9299],[0.1639,0.9283],[0.1928,0.9221],[0.2337,0.9221],[0.253,0.9283],[0.2964,0.9502],[0.3133,0.9548],[0.3301,0.9548],[0.3494,0.9486],[0.3783,0.933],[0.3952,0.9283],[0.4241,0.9283],[0.4747,0.9361],[0.5084,0.933],[0.5325,0.9221],[0.5735,0.8941],[0.5904,0.8863],[0.6145,0.8816],[0.6482,0.8801],[0.6699,0.8754],[0.6892,0.8629]],[[0.8723,0.7508],[0.8482,0.7523],[0.8337,0.7601],[0.8289,0.7664],[0.8289,0.7788],[0.8337,0.785],[0.8506,0.7975],[0.8627,0.8022],[0.8602,0.8131],[0.841,0.8146],[0.8241,0.8193],[0.812,0.8287],[0.8048,0.8396],[0.7904,0.8396],[0.7807,0.8224],[0.7663,0.8115],[0.7542,0.8069],[0.7373,0.8069],[0.7205,0.8162],[0.7108,0.8333],[0.7108,0.8411],[0.7181,0.8536],[0.7373,0.8645],[0.7494,0.8645],[0.7735,0.8567],[0.7904,0.8583],[0.7904,0.8676],[0.7735,0.8972],[0.7735,0.9143],[0.7855,0.9299],[0.8169,0.9439],[0.841,0.9439],[0.8747,0.9346],[0.894,0.9174],[0.9036,0.8956],[0.9036,0.8458],[0.8916,0.8271],[0.8747,0.8178],[0.8747,0.8084],[0.8988,0.8053],[0.9108,0.7975],[0.9157,0.7882],[0.9157,0.7726],[0.906,0.7617]],[[0.2048,0.7274],[0.2024,0.7399],[0.2169,0.7477],[0.2289,0.7492],[0.2506,0.7632],[0.2771,0.7648],[0.2867,0.7601],[0.2916,0.7477],[0.2867,0.7399],[0.2747,0.7321],[0.2554,0.729],[0.2386,0.7227],[0.2096,0.7243]],[[0.0627,0.7212],[0.053,0.729],[0.0506,0.7414],[0.0602,0.7539],[0.0747,0.7632],[0.094,0.7695],[0.1133,0.771],[0.1325,0.7664],[0.1446,0.7586],[0.1518,0.7477],[0.1518,0.7399],[0.1422,0.7243],[0.1301,0.7181],[0.1108,0.7118],[0.0892,0.7118],[0.0795,0.7196]],[[0.8241,0.7181],[0.8169,0.7103],[0.8048,0.704],[0.7759,0.6994],[0.7494,0.704],[0.7205,0.7181],[0.6554,0.7181],[0.6193,0.7274],[0.5928,0.7445],[0.5855,0.757],[0.588,0.7757],[0.6072,0.7928],[0.6193,0.7944],[0.6217,0.7991],[0.6337,0.8037],[0.6627,0.8069],[0.6964,0.8022],[0.7277,0.7897],[0.759,0.7866],[0.7783,0.7804],[0.7904,0.7726],[0.8265,0.7368]],[[0.9012,0.6838],[0.8747,0.6838],[0.8627,0.69],[0.8482,0.7056],[0.853,0.7196],[0.8699,0.729],[0.8892,0.729],[0.9133,0.715],[0.9157,0.6963],[0.9084,0.6869]],[[0.3277,0.7009],[0.3277,0.715],[0.3422,0.7243],[0.3614,0.7274],[0.4096,0.729],[0.4795,0.7445],[0.5133,0.7445],[0.5277,0.7399],[0.5422,0.729],[0.5494,0.715],[0.5494,0.6947],[0.5422,0.6822],[0.5277,0.6729],[0.5036,0.6667],[0.3807,0.6667],[0.3542,0.6776],[0.3398,0.6869]],[[0.7084,0.648],[0.6964,0.648],[0.6867,0.6433],[0.6699,0.6402],[0.6386,0.6417],[0.6265,0.6449],[0.6241,0.648],[0.6096,0.648],[0.5855,0.6604],[0.5807,0.6667],[0.5831,0.6822],[0.5904,0.6869],[0.6096,0.69],[0.6217,0.6947],[0.6771,0.6947],[0.6916,0.6916],[0.7108,0.6807],[0.7157,0.6729]],[[0.8651,0.6153],[0.8554,0.6184],[0.8434,0.6277],[0.8386,0.6386],[0.841,0.648],[0.8482,0.6558],[0.8699,0.6651],[0.8892,0.6651],[0.9012,0.6604],[0.9133,0.6511],[0.9133,0.6324],[0.8964,0.6184],[0.8843,0.6153]],[[0.7205,0.5935],[0.7036,0.6075],[0.7036,0.6231],[0.7133,0.6371],[0.7133,0.6449],[0.7253,0.6449],[0.7542,0.6542],[0.7807,0.6542],[0.7976,0.6495],[0.8169,0.6371],[0.8169,0.6153],[0.8072,0.6028],[0.7952,0.595],[0.7952,0.5919],[0.7831,0.5919],[0.7687,0.5872],[0.7422,0.5872]],[[0.2337,0.5794],[0.1976,0.581],[0.159,0.5919],[0.1422,0.6012],[0.1349,0.6106],[0.1349,0.6184],[0.1229,0.6231],[0.1157,0.6355],[0.1133,0.6604],[0.1229,0.6791],[0.1494,0.6978],[0.1831,0.7072],[0.2024,0.7087],[0.2482,0.7025],[0.2651,0.6963],[0.2867,0.6822],[0.2964,0.6682],[0.306,0.662],[0.3084,0.6262],[0.2988,0.609],[0.2747,0.5919]],[[0.359,0.5717],[0.3349,0.5841],[0.3301,0.5903],[0.3301,0.6075],[0.3422,0.6215],[0.3518,0.6277],[0.3687,0.6324],[0.3831,0.6324],[0.3928,0.6293],[0.4048,0.6184],[0.4096,0.6075],[0.4072,0.5935],[0.3928,0.5779],[0.3759,0.5717]],[[0.0964,0.5685],[0.0771,0.5701],[0.0627,0.5779],[0.0602,0.5841],[0.053,0.5872],[0.0482,0.6044],[0.0651,0.6153],[0.0867,0.6168],[0.0988,0.6137],[0.1108,0.6059],[0.1181,0.5966],[0.1205,0.5826],[0.106,0.5717]],[[0.4554,0.6106],[0.4699,0.6293],[0.4867,0.6386],[0.5205,0.648],[0.5542,0.648],[0.5663,0.6449],[0.5904,0.6324],[0.5976,0.6075],[0.612,0.6075],[0.6265,0.6137],[0.641,0.6137],[0.6627,0.6059],[0.6627,0.5966],[0.6554,0.5888],[0.641,0.5826],[0.6241,0.5826],[0.6048,0.595],[0.5904,0.595],[0.5831,0.5872],[0.5639,0.5763],[0.5398,0.5685],[0.5157,0.567],[0.4843,0.5732],[0.4675,0.5826],[0.4578,0.595]],[[0.8602,0.5639],[0.8482,0.5748],[0.8482,0.5841],[0.853,0.5919],[0.8699,0.5997],[0.8916,0.5981],[0.9036,0.5903],[0.9012,0.5748],[0.8843,0.5639]],[[0.4,0.5312],[0.3928,0.5405],[0.4,0.5576],[0.4265,0.5701],[0.4458,0.5701],[0.4554,0.5639],[0.4554,0.5592],[0.4602,0.5561],[0.4602,0.5483],[0.4506,0.5374],[0.441,0.5327],[0.441,0.5296],[0.4289,0.5296],[0.4217,0.5265]],[[0.5735,0.5249],[0.5542,0.5389],[0.5566,0.5514],[0.5687,0.5592],[0.588,0.5654],[0.6072,0.5654],[0.6217,0.5607],[0.6313,0.5514],[0.6313,0.5452],[0.6217,0.5343],[0.6096,0.5265],[0.5928,0.5218]],[[0.2819,0.4953],[0.2723,0.4984],[0.2506,0.5156],[0.2506,0.5389],[0.2602,0.553],[0.294,0.5639],[0.3181,0.5639],[0.3373,0.5576],[0.3518,0.5467],[0.359,0.5358],[0.3566,0.5171],[0.3373,0.5016],[0.3181,0.4953]],[[0.7614,0.4377],[0.7229,0.4439],[0.6771,0.4642],[0.653,0.4891],[0.6506,0.5078],[0.6651,0.5358],[0.6988,0.5576],[0.7398,0.567],[0.788,0.567],[0.8217,0.5607],[0.841,0.5545],[0.8675,0.5389],[0.8843,0.5171],[0.8867,0.4953],[0.8819,0.4829],[0.8699,0.4673],[0.841,0.4486],[0.7976,0.4377]],[[0.3133,0.3707],[0.294,0.3816],[0.2747,0.4034],[0.2699,0.4143],[0.2699,0.4299],[0.2819,0.447],[0.3036,0.4579],[0.3422,0.4642],[0.3446,0.4735],[0.3735,0.4735],[0.4048,0.4984],[0.4289,0.5125],[0.4434,0.5171],[0.4458,0.5218],[0.4843,0.5265],[0.5084,0.5218],[0.5446,0.5093],[0.5855,0.5031],[0.6096,0.4938],[0.6386,0.4735],[0.6386,0.4673],[0.6434,0.4642],[0.6482,0.4533],[0.6434,0.4361],[0.6241,0.4206],[0.5976,0.4112],[0.547,0.3754],[0.5349,0.3707],[0.5349,0.3676],[0.5205,0.3676],[0.4843,0.3583],[0.4554,0.3551],[0.388,0.3692]],[[0.8554,0.296],[0.8386,0.2991],[0.8241,0.3115],[0.8241,0.3255],[0.8361,0.3411],[0.8458,0.3474],[0.8458,0.3567],[0.8024,0.3567],[0.7759,0.3676],[0.7639,0.3847],[0.7639,0.3956],[0.7711,0.405],[0.788,0.4159],[0.8145,0.4237],[0.8434,0.4237],[0.8554,0.4206],[0.8771,0.4019],[0.8771,0.3847],[0.8675,0.3707],[0.8578,0.3645],[0.8578,0.3551],[0.8771,0.352],[0.8892,0.3442],[0.8988,0.3302],[0.8988,0.3209],[0.8819,0.3037]],[[0.3036,0.2445],[0.2892,0.2523],[0.2723,0.2773],[0.2458,0.2975],[0.2458,0.3069],[0.2361,0.3084],[0.2313,0.3131],[0.2289,0.324],[0.2386,0.3442],[0.2506,0.3536],[0.2699,0.3598],[0.3108,0.3614],[0.3133,0.3583],[0.3253,0.3551],[0.3373,0.3474],[0.3518,0.324],[0.3518,0.3069],[0.3349,0.2819],[0.3277,0.2523],[0.3205,0.2461]],[[0.8651,0.2445],[0.8554,0.2539],[0.8602,0.2679],[0.8771,0.2773],[0.894,0.2773],[0.906,0.2664],[0.9036,0.2523],[0.8867,0.243]],[[0.2217,0.229],[0.2096,0.2383],[0.212,0.2555],[0.2265,0.2648],[0.241,0.2648],[0.2482,0.2617],[0.2578,0.2492],[0.2554,0.2399],[0.2434,0.2305]],[[0.2217,0.1869],[0.2217,0.1947],[0.2289,0.204],[0.2675,0.2227],[0.2843,0.2259],[0.2988,0.2243],[0.3133,0.215],[0.3181,0.2056],[0.3157,0.1963],[0.3036,0.1869],[0.2916,0.1822],[0.2361,0.1807]],[[0.3518,0.1822],[0.3398,0.1963],[0.3349,0.2103],[0.3398,0.229],[0.3518,0.2414],[0.388,0.2601],[0.4072,0.2741],[0.4169,0.2913],[0.4241,0.3193],[0.441,0.3349],[0.4699,0.3427],[0.4867,0.3411],[0.4988,0.3364],[0.5157,0.3364],[0.5205,0.3474],[0.5373,0.3567],[0.5373,0.3598],[0.5663,0.3614],[0.5831,0.3567],[0.5952,0.3474],[0.6096,0.3474],[0.6145,0.3505],[0.6169,0.3676],[0.6289,0.3847],[0.641,0.3925],[0.6602,0.3988],[0.6795,0.3988],[0.694,0.3956],[0.7108,0.3879],[0.7494,0.3614],[0.7518,0.3551],[0.7614,0.3489],[0.7831,0.3224],[0.8,0.2913],[0.8,0.2679],[0.7928,0.257],[0.7807,0.2492],[0.7639,0.2445],[0.7373,0.2445],[0.7133,0.2508],[0.6892,0.2617],[0.641,0.2944],[0.6193,0.3224],[0.6145,0.3411],[0.5952,0.3427],[0.5783,0.324],[0.5663,0.3193],[0.5518,0.3178],[0.5373,0.3224],[0.5229,0.3224],[0.5205,0.31],[0.5108,0.2975],[0.4747,0.2757],[0.4747,0.2695],[0.4602,0.2632],[0.453,0.2508],[0.453,0.2259],[0.4602,0.2087],[0.4602,0.1885],[0.4554,0.1885],[0.4289,0.1745],[0.3952,0.1698],[0.3711,0.1729]],[[0.1133,0.081],[0.0988,0.0888],[0.0916,0.0981],[0.094,0.1184],[0.0988,0.1246],[0.1108,0.1308],[0.1108,0.1402],[0.0964,0.1511],[0.094,0.1745],[0.1157,0.204],[0.1205,0.2181],[0.1205,0.2352],[0.1157,0.2477],[0.0795,0.2991],[0.0795,0.3193],[0.0916,0.3411],[0.1157,0.3723],[0.1181,0.4003],[0.0988,0.4315],[0.0819,0.447],[0.0699,0.4657],[0.053,0.4829],[0.0482,0.4938],[0.0482,0.5109],[0.0602,0.528],[0.0747,0.5389],[0.0892,0.5452],[0.1108,0.5498],[0.1446,0.5514],[0.1807,0.5467],[0.2024,0.5389],[0.2169,0.5296],[0.2313,0.5109],[0.2337,0.4922],[0.2265,0.472],[0.1928,0.4221],[0.1928,0.3863],[0.188,0.3645],[0.1783,0.3505],[0.1566,0.3302],[0.147,0.3146],[0.147,0.296],[0.159,0.271],[0.1807,0.243],[0.1807,0.2243],[0.1639,0.2009],[0.1373,0.1776],[0.1277,0.1651],[0.1277,0.1464],[0.1205,0.1402],[0.1205,0.1308],[0.1301,0.1277],[0.1398,0.1199],[0.1446,0.1044],[0.1398,0.0872],[0.1277,0.0826]],[[0.1181,0.0436],[0.1084,0.0467],[0.1036,0.0514],[0.1036,0.0623],[0.1133,0.067],[0.1277,0.067],[0.1398,0.0623],[0.1398,0.0498],[0.1325,0.0452]],[[0.788,0.0405],[0.7687,0.053],[0.7639,0.0592],[0.7639,0.0732],[0.7687,0.0794],[0.788,0.0919],[0.8096,0.0981],[0.8386,0.0981],[0.8651,0.0888],[0.8723,0.0794],[0.8723,0.0717],[0.853,0.0498],[0.8386,0.0405],[0.8193,0.0358],[0.7976,0.0374]],[[0.2843,0.0343],[0.253,0.0421],[0.2289,0.0561],[0.2048,0.0888],[0.1952,0.1075],[0.1952,0.1293],[0.2072,0.1449],[0.2169,0.1511],[0.2386,0.1589],[0.2723,0.1651],[0.3133,0.1651],[0.3446,0.1604],[0.3711,0.1526],[0.4024,0.134],[0.4193,0.1106],[0.4193,0.0794],[0.4024,0.0592],[0.3759,0.0467],[0.3253,0.0343]],[[0.4747,0.0405],[0.4675,0.0498],[0.4675,0.0685],[0.4771,0.0857],[0.506,0.1168],[0.506,0.1293],[0.4747,0.1558],[0.4747,0.1667],[0.4892,0.1791],[0.5325,0.1931],[0.5494,0.2056],[0.5494,0.2539],[0.5542,0.2648],[0.5687,0.2741],[0.5928,0.2804],[0.6169,0.2788],[0.6289,0.2741],[0.6482,0.2586],[0.6578,0.2461],[0.6819,0.204],[0.6892,0.1978],[0.694,0.1978],[0.6964,0.1931],[0.7084,0.1885],[0.7349,0.1885],[0.7687,0.204],[0.8,0.2134],[0.8145,0.215],[0.841,0.2118],[0.8578,0.2056],[0.8747,0.1885],[0.8747,0.1698],[0.8675,0.1573],[0.8458,0.1386],[0.8217,0.1262],[0.7831,0.1153],[0.7614,0.1137],[0.7349,0.1044],[0.7277,0.0935],[0.7277,0.0607],[0.7205,0.0498],[0.7108,0.0436],[0.6964,0.0389],[0.6675,0.0389],[0.6482,0.0467],[0.6169,0.0685],[0.6024,0.0732],[0.5831,0.0732],[0.5735,0.0701],[0.5373,0.0405],[0.5205,0.0327],[0.494,0.0312]]];

const W = 12, D = W * 642 / 415;               // sheet keeps the photo's proportions
const SHEET_T = .22, SHEET_Y = -1.6, TOP = SHEET_Y + SHEET_T;
const FALL_H = 15, GRAVITY = 32, INTERVAL = .42, START_DELAY = 1.2;

export function createDropletIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-drops'; scene.add(root);
  const obstacles = [];

  // Thin clear acrylic sheet with softly rounded corners.
  const sheetShape = roundedRect(W, D, .45);
  const sheetGeo = new THREE.ExtrudeGeometry(sheetShape, { depth: SHEET_T - .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 10 });
  sheetGeo.rotateX(-Math.PI / 2); sheetGeo.translate(0, SHEET_Y + .02, 0);
  const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xf6fbfd, transmission: 1, roughness: .03, ior: 1.49, thickness: SHEET_T, attenuationColor: 0xe3f1f6, attenuationDistance: 2.5, specularIntensity: 1, envMapIntensity: 1 });
  const sheet = new THREE.Mesh(sheetGeo, acrylic); sheet.receiveShadow = true; root.add(sheet);

  // Water: a clear, slightly glossy lens material shared by every drop.
  const water = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .02, ior: 1.33, thickness: .35, attenuationColor: 0xeef8f8, attenuationDistance: 3, specularIntensity: 1, envMapIntensity: 1.3 });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1d2a30, transparent: true, opacity: 0, depthWrite: false });
  const ball = new THREE.SphereGeometry(1, 20, 14), disc = new THREE.CircleGeometry(1, 28); disc.rotateX(-Math.PI / 2);

  const drops = SHAPES.map(points => {
    const pts = points.map(([u, v]) => new THREE.Vector2((u - .5) * W, (v - .5) * D * -1)); // shape y = -z
    const shape = new THREE.Shape(pts);
    let cx = 0, cz = 0; pts.forEach(p => { cx += p.x; cz -= p.y; }); cx /= pts.length; cz /= pts.length;
    const area = Math.abs(THREE.ShapeUtils.area(pts)), size = Math.sqrt(area);
    let reach = 0; pts.forEach(p => { reach = Math.max(reach, Math.hypot(p.x - cx, -p.y - cz)); });
    const h = Math.min(.36, .07 + size * .085), edge = Math.min(h * .95, size * .22);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .005, bevelEnabled: true, bevelThickness: h, bevelSize: edge, bevelOffset: -edge, bevelSegments: 6, curveSegments: 14 });
    geo.rotateX(-Math.PI / 2);
    // flatten the underside so the puddle sits on the sheet
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setY(i, y < 0 ? y * .04 : y); }
    geo.translate(-cx, 0, -cz); geo.computeVertexNormals();
    const puddle = new THREE.Mesh(geo, water); puddle.position.set(cx, TOP + .004, cz); puddle.castShadow = true; puddle.visible = false; root.add(puddle);
    const r = THREE.MathUtils.clamp(size * .3, .1, .6);
    const falling = new THREE.Mesh(ball, water); falling.scale.set(r, r * 1.35, r); falling.castShadow = true; falling.visible = false; root.add(falling);
    const mark = new THREE.Mesh(disc, shadowMat.clone()); mark.position.set(cx, TOP + .006, cz); mark.scale.setScalar(Math.max(r, reach * .5)); mark.visible = false; root.add(mark);
    return { cx, cz, reach, r, puddle, falling, mark, t0: 0, state: 'wait' };
  });

  // Splash: a few tiny droplets flung out on impact.
  const sprayGeo = new THREE.SphereGeometry(1, 10, 8), spray = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(sprayGeo, water); m.visible = false; root.add(m); spray.push({ m, v: new THREE.Vector3(), life: 0 }); }
  let sprayNext = 0;
  const splash = (x, z, r) => {
    for (let i = 0; i < 6; i++) {
      const s = spray[sprayNext++ % spray.length], a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      s.m.position.set(x + Math.cos(a) * r * .6, TOP + .05, z + Math.sin(a) * r * .6); s.m.scale.setScalar(.03 + Math.random() * .05);
      s.v.set(Math.cos(a) * sp, 2.5 + Math.random() * 2.5, Math.sin(a) * sp); s.life = .55; s.m.visible = true;
    }
  };

  // The swim bear, walking on the sheet (its own swimming code is not used here).
  const bear = createSwimBear(root, { x: 0, z: 0 });
  const { arms, legs, head, rings } = bear.parts; rings.forEach(r => { r.visible = false; });
  const body = bear.object; body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
  const footOffset = -new THREE.Box3().setFromObject(body).min.y;
  const walker = { x: 0, z: 2, vx: 0, vz: 0, yaw: 0, phase: 0, target: new THREE.Vector2(0, 2), flinch: 0 };
  const LIMIT_X = W / 2 - .9, LIMIT_Z = D / 2 - .9;
  const newTarget = () => {
    // pick a spot away from drops that are about to land
    let best = null, bestScore = -1;
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() * 2 - 1) * LIMIT_X, z = (Math.random() * 2 - 1) * LIMIT_Z;
      let score = Math.hypot(x - walker.x, z - walker.z) * .15;
      for (const d of drops) if (d.state === 'falling' || d.state === 'wait') score += Math.min(3, Math.hypot(x - d.cx, z - d.cz) - d.reach) * (d.state === 'falling' ? 1 : .15);
      if (score > bestScore) { bestScore = score; best = [x, z]; }
    }
    walker.target.set(best[0], best[1]);
  };

  let start = null, last = null, order = [];
  const reset = time => {
    start = time; order = drops.map((_, i) => i).sort(() => Math.random() - .5);
    order.forEach((i, k) => { const d = drops[i]; d.t0 = START_DELAY + k * INTERVAL; d.state = 'wait'; d.puddle.visible = false; d.falling.visible = false; d.mark.visible = false; });
    walker.x = 0; walker.z = 2; walker.vx = walker.vz = 0; newTarget();
  };

  const house = createDogHouse(root, obstacles, { x: 0, z: D / 2 + 3, y: SHEET_Y });
  const toy = createFetchToy(root, { x: 0, y: SHEET_Y + .17, z: D / 2 + 2 }, island.spawn);
  house.object.visible = false; toy.ball.visible = false;

  const world = {
    root, island, obstacles, house, fetchActivity: toy, bear, drops,
    navigationOptions: { bounds: { minX: -W / 2 + .5, maxX: W / 2 - .5, minZ: -D / 2 + .5, maxZ: D / 2 - .5 }, clearance: .6, min: -11, size: 60 },
    activity: { type: 'none' },
    view: { center: { x: 0, z: 0 }, min: [-W / 2 - .3, SHEET_Y, -D / 2 - .3], max: [W / 2 + .3, 2.6, D / 2 + .3] },
    ready: Promise.resolve(),
    heightAt(x, z) { return Math.abs(x) <= W / 2 && Math.abs(z) <= D / 2 ? TOP : SHEET_Y; },
    get finished() { return drops.every(d => d.state === 'landed'); },
    update(time, reducedMotion) {
      // replay whenever the island is shown again
      if (start === null || (last !== null && time - last > 1)) reset(time);
      const dt = last === null ? 0 : Math.min(.05, Math.max(0, time - last)); last = time;
      const t = time - start;
      for (const d of drops) {
        if (d.state === 'wait' && t >= d.t0) { d.state = 'falling'; d.falling.visible = true; d.mark.visible = true; }
        if (d.state === 'falling') {
          const ft = t - d.t0, y = FALL_H - .5 * GRAVITY * ft * ft, k = Math.min(1, ft / Math.sqrt(2 * FALL_H / GRAVITY));
          d.falling.position.set(d.cx, TOP + d.r + Math.max(0, y), d.cz);
          d.mark.material.opacity = .05 + .2 * k; d.mark.scale.setScalar(Math.max(d.r, d.reach * .5) * (1.6 - .6 * k));
          if (y <= 0 || reducedMotion) {
            d.state = 'splat'; d.splatAt = t; d.falling.visible = false; d.mark.visible = false; d.puddle.visible = true;
            if (!reducedMotion) splash(d.cx, d.cz, d.reach);
            if (Math.hypot(walker.x - d.cx, walker.z - d.cz) < d.reach + .5) walker.flinch = .6;
          }
        }
        if (d.state === 'splat') {
          // squash in, overshoot and settle into the puddle shape
          const s = t - d.splatAt, e = Math.exp(-s * 7);
          const spread = .3 + .7 * (1 - e * Math.cos(s * 15)), tall = 1 + 1.4 * Math.exp(-s * 9);
          d.puddle.scale.set(spread, tall, spread);
          if (s > .9 || reducedMotion) { d.state = 'landed'; d.puddle.scale.set(1, 1, 1); }
        }
      }
      for (const s of spray) if (s.life > 0) {
        s.life -= dt; s.v.y -= 18 * dt; s.m.position.addScaledVector(s.v, dt);
        if (s.m.position.y < TOP + .02) { s.m.position.y = TOP + .02; s.v.set(0, 0, 0); }
        if (s.life <= 0) s.m.visible = false;
      }
      updateBear(time, dt, t, reducedMotion);
    },
    setMood() {},
  };

  function updateBear(time, dt, t, reducedMotion) {
    let ax = 0, az = 0, danger = 0;
    if (!reducedMotion && !world.finished) {
      // head for the wander target…
      const tx = walker.target.x - walker.x, tz = walker.target.y - walker.z, td = Math.hypot(tx, tz);
      if (td < .5) newTarget(); else { ax += tx / td * 1.3; az += tz / td * 1.3; }
      // …but get out from under any drop about to land, and step round puddles
      for (const d of drops) {
        const dx = walker.x - d.cx, dz = walker.z - d.cz, dist = Math.hypot(dx, dz) || .001;
        if (d.state === 'falling') {
          const left = d.t0 + Math.sqrt(2 * FALL_H / GRAVITY) - t, safe = d.reach + 1.3;
          if (dist < safe + 1.2 && left < 1.4) {
            const push = (safe + 1.2 - dist) * (1.6 - left) * 3.2; ax += dx / dist * push; az += dz / dist * push; danger = Math.max(danger, 1.4 - left);
          }
        } else if (d.state !== 'wait' && dist < d.reach + .45) { const push = (d.reach + .45 - dist) * 2; ax += dx / dist * push; az += dz / dist * push; }
      }
      // stay on the sheet
      if (Math.abs(walker.x) > LIMIT_X) ax -= Math.sign(walker.x) * (Math.abs(walker.x) - LIMIT_X) * 6;
      if (Math.abs(walker.z) > LIMIT_Z) az -= Math.sign(walker.z) * (Math.abs(walker.z) - LIMIT_Z) * 6;
      if (danger > .2 && Math.random() < .02) newTarget();
    }
    const max = danger > .1 ? 4.2 : 1.35, mag = Math.hypot(ax, az);
    const wantX = mag > 0 ? ax / Math.max(1, mag) * max : 0, wantZ = mag > 0 ? az / Math.max(1, mag) * max : 0;
    const blend = Math.min(1, dt * (danger > .1 ? 9 : 3));
    walker.vx += (wantX - walker.vx) * blend; walker.vz += (wantZ - walker.vz) * blend;
    walker.x = THREE.MathUtils.clamp(walker.x + walker.vx * dt, -W / 2 + .5, W / 2 - .5);
    walker.z = THREE.MathUtils.clamp(walker.z + walker.vz * dt, -D / 2 + .5, D / 2 - .5);
    const speed = Math.hypot(walker.vx, walker.vz);
    if (speed > .15) { let dy = Math.atan2(walker.vx, walker.vz) - walker.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); walker.yaw += dy * Math.min(1, dt * 8); }
    // when every drop has landed, turn towards the viewer and wave
    const done = world.finished;
    if (done && speed < .2) { let dy = 0 - walker.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); walker.yaw += dy * Math.min(1, dt * 2); }
    walker.phase += dt * (2.2 + speed * 2.6);
    walker.flinch = Math.max(0, walker.flinch - dt);
    const stride = Math.min(1, speed / 1.4), run = Math.min(1, Math.max(0, (speed - 1.6) / 2));
    const bob = Math.abs(Math.sin(walker.phase)) * .07 * stride;
    body.position.set(walker.x, TOP + footOffset + bob - walker.flinch * .12, walker.z);
    body.rotation.set(run * .25 + walker.flinch * .2, walker.yaw, Math.sin(walker.phase) * .06 * stride);
    body.scale.set(1.32 * (1 + walker.flinch * .15), 1.32 * (1 - walker.flinch * .2), 1.32 * (1 + walker.flinch * .15));
    arms.forEach((arm, i) => {
      const side = i ? 1 : -1, swing = Math.sin(walker.phase + i * Math.PI);
      if (run > .3 || walker.flinch > 0) { arm.rotation.x = -2.6 + swing * .5; arm.rotation.z = side * .5; }   // arms up while dashing away
      else if (done) { arm.rotation.x = i ? -2.4 + Math.sin(time * 6) * .35 : swing * .15; arm.rotation.z = side * (i ? .5 : .15); } // a little wave
      else { arm.rotation.x = swing * .6 * stride; arm.rotation.z = side * .12; }
    });
    legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walker.phase + i * Math.PI) * (.55 + run * .35) * stride; leg.rotation.z = 0; });
    head.rotation.z = Math.sin(time * 1.3) * .05; head.rotation.x = danger > .3 ? -.25 : 0;
  }

  return world;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape(), x = w / 2, y = d / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}
