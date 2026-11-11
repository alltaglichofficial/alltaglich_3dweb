import * as THREE from 'three';
import { RoomEnvironment } from '../product/vendor/environments/RoomEnvironment.js';
import { createSwimBear } from './bear.js';
import { replaceWithPlush } from './plush.js';
import { createDogHouse, createFetchToy } from './house.js';

// Droplet island: a thin clear acrylic sheet. Water drops fall on it one by one
// and splat into the puddle shapes of the droplet photo; the swim bear walks
// about on the sheet and dodges each drop before it lands. Once every drop has
// fallen, the sheet shows the photo's layout. Entering the island again replays it.

// Puddle outlines from the production guide (물방울 에폭시 가이드): u, v in 0–1 of the
// guide's frame, v = 0 at the top.
const SHAPES = [[[0.7404,0.9111],[0.7357,0.9051],[0.7281,0.9002],[0.7178,0.8978],[0.65,0.9008],[0.6331,0.9033],[0.6256,0.9063],[0.6096,0.9178],[0.6011,0.9305],[0.6011,0.9426],[0.6077,0.948],[0.6162,0.9498],[0.6341,0.948],[0.6529,0.948],[0.6971,0.9559],[0.715,0.9565],[0.7234,0.9553],[0.7357,0.9498],[0.7441,0.9371],[0.7451,0.9244]],[[0.8796,0.8198],[0.8542,0.8198],[0.842,0.8235],[0.8325,0.8295],[0.8147,0.8549],[0.7921,0.8954],[0.7893,0.9105],[0.793,0.9214],[0.8024,0.9317],[0.8119,0.9377],[0.8269,0.9426],[0.8523,0.9432],[0.8777,0.9371],[0.8946,0.9268],[0.9022,0.919],[0.9078,0.9093],[0.9163,0.873],[0.9144,0.8513],[0.9087,0.8392],[0.9012,0.8301],[0.8928,0.8241]],[[0.7648,0.8108],[0.7545,0.8114],[0.7451,0.815],[0.7366,0.8216],[0.73,0.8319],[0.7291,0.8422],[0.7328,0.8513],[0.7404,0.8597],[0.7507,0.864],[0.762,0.8634],[0.7817,0.8579],[0.793,0.8519],[0.7977,0.8446],[0.7977,0.8337],[0.7902,0.8229],[0.7789,0.815]],[[0.1232,0.7981],[0.111,0.8011],[0.0988,0.8083],[0.0931,0.8162],[0.0922,0.8271],[0.0969,0.8349],[0.1063,0.8422],[0.1176,0.8464],[0.1383,0.8476],[0.1524,0.844],[0.1618,0.8386],[0.1693,0.8295],[0.1703,0.8186],[0.1656,0.8108],[0.1533,0.8023],[0.1383,0.7981]],[[0.1994,0.789],[0.1994,0.8005],[0.2041,0.8083],[0.2145,0.815],[0.2277,0.8174],[0.2408,0.8174],[0.2634,0.8132],[0.2803,0.8071],[0.2907,0.7987],[0.2907,0.7926],[0.2785,0.783],[0.2634,0.7781],[0.2484,0.7757],[0.2267,0.7751],[0.2154,0.7769],[0.2041,0.7823]],[[0.7037,0.8507],[0.699,0.8446],[0.6924,0.8404],[0.6783,0.8349],[0.6557,0.8319],[0.6152,0.8307],[0.603,0.8277],[0.5757,0.8156],[0.5484,0.8102],[0.5353,0.8029],[0.5155,0.783],[0.5052,0.7763],[0.4939,0.7727],[0.4854,0.7715],[0.4647,0.7721],[0.4177,0.7811],[0.3998,0.7811],[0.365,0.7751],[0.3452,0.7745],[0.3321,0.7775],[0.3236,0.7836],[0.3198,0.7902],[0.3208,0.7999],[0.3358,0.8204],[0.3387,0.8277],[0.3368,0.8356],[0.3274,0.8434],[0.318,0.8464],[0.3067,0.8476],[0.2568,0.8458],[0.238,0.8489],[0.2164,0.8549],[0.1825,0.8688],[0.1317,0.896],[0.1261,0.9027],[0.1251,0.9117],[0.1279,0.9172],[0.1373,0.9238],[0.1505,0.9268],[0.1759,0.925],[0.2192,0.9178],[0.2408,0.9184],[0.2634,0.925],[0.3133,0.9486],[0.3246,0.9516],[0.3415,0.9522],[0.3547,0.9492],[0.3913,0.9311],[0.4102,0.9262],[0.4337,0.9262],[0.4854,0.9341],[0.5042,0.9341],[0.5155,0.9323],[0.5381,0.9232],[0.5842,0.8936],[0.5983,0.8869],[0.6162,0.8821],[0.667,0.8779],[0.6849,0.873],[0.699,0.8646],[0.7037,0.8579]],[[0.857,0.7606],[0.8504,0.7648],[0.8457,0.7715],[0.8467,0.7805],[0.8551,0.7908],[0.8674,0.7987],[0.8833,0.8047],[0.8937,0.8065],[0.905,0.8065],[0.9125,0.8047],[0.92,0.7999],[0.9257,0.7878],[0.9247,0.7775],[0.9182,0.7684],[0.904,0.7606],[0.8881,0.757],[0.8711,0.7563]],[[0.2201,0.731],[0.2183,0.734],[0.2201,0.7418],[0.2267,0.7461],[0.2465,0.7503],[0.2615,0.7606],[0.2747,0.7642],[0.2879,0.7642],[0.2992,0.7588],[0.302,0.7545],[0.301,0.7443],[0.2973,0.74],[0.286,0.734],[0.2738,0.7322],[0.254,0.7249],[0.2295,0.7267]],[[0.0865,0.7183],[0.0781,0.7231],[0.0706,0.7334],[0.0706,0.7443],[0.079,0.7551],[0.095,0.7636],[0.1148,0.7678],[0.1355,0.7672],[0.1496,0.7624],[0.1571,0.757],[0.1627,0.7473],[0.1609,0.734],[0.1505,0.7231],[0.1326,0.7158],[0.1214,0.714],[0.1054,0.714]],[[0.8325,0.7195],[0.8213,0.711],[0.8109,0.7074],[0.7846,0.7056],[0.7714,0.7074],[0.7432,0.7201],[0.73,0.7231],[0.6792,0.7219],[0.6566,0.7255],[0.6322,0.7334],[0.6143,0.7437],[0.604,0.7576],[0.604,0.7763],[0.6162,0.7902],[0.6303,0.7987],[0.6463,0.8041],[0.6623,0.8065],[0.6745,0.8065],[0.7084,0.8029],[0.7357,0.7914],[0.7799,0.7848],[0.7912,0.7805],[0.7987,0.7757],[0.8354,0.7424],[0.8373,0.7291]],[[0.9247,0.688],[0.9078,0.688],[0.8956,0.6923],[0.8805,0.7013],[0.8692,0.7134],[0.8683,0.7213],[0.8711,0.7279],[0.8758,0.7334],[0.8909,0.7412],[0.904,0.7424],[0.921,0.7382],[0.9304,0.7322],[0.9407,0.7201],[0.9436,0.714],[0.9426,0.7001],[0.937,0.6935]],[[0.3471,0.705],[0.3471,0.7177],[0.3594,0.7255],[0.3716,0.7273],[0.4055,0.7267],[0.4214,0.7285],[0.477,0.7412],[0.4986,0.7443],[0.5221,0.7443],[0.539,0.7394],[0.5503,0.7316],[0.5588,0.7164],[0.5579,0.6971],[0.5503,0.6844],[0.539,0.6765],[0.5174,0.6723],[0.444,0.6705],[0.4026,0.6711],[0.3866,0.6753],[0.3706,0.6826],[0.3584,0.6911]],[[0.7253,0.6663],[0.7178,0.6572],[0.7037,0.6499],[0.6811,0.6463],[0.6557,0.6475],[0.6341,0.6518],[0.6152,0.6584],[0.6011,0.6693],[0.5983,0.6808],[0.6021,0.6874],[0.6077,0.6911],[0.619,0.6941],[0.6472,0.6965],[0.6877,0.6959],[0.7056,0.6923],[0.7206,0.6844],[0.7262,0.6771]],[[0.8881,0.6215],[0.8758,0.6239],[0.8664,0.6288],[0.8598,0.636],[0.857,0.6469],[0.8627,0.6578],[0.8721,0.6644],[0.8833,0.6681],[0.8946,0.6687],[0.9078,0.6657],[0.9182,0.6596],[0.9247,0.6505],[0.9257,0.6433],[0.921,0.6336],[0.9116,0.6264],[0.8984,0.6221]],[[0.7357,0.601],[0.7234,0.6119],[0.7206,0.6179],[0.7206,0.6288],[0.7253,0.6372],[0.7375,0.6469],[0.7535,0.6536],[0.7723,0.6572],[0.7987,0.656],[0.8071,0.6536],[0.8175,0.6481],[0.8269,0.6372],[0.8288,0.6252],[0.8231,0.6131],[0.809,0.6022],[0.794,0.5967],[0.7789,0.5943],[0.7573,0.5949],[0.7451,0.5973]],[[0.6566,0.5871],[0.6463,0.5895],[0.6322,0.5973],[0.6275,0.6028],[0.6265,0.6088],[0.6303,0.6143],[0.6406,0.6197],[0.6519,0.6221],[0.6642,0.6227],[0.6839,0.6179],[0.6914,0.6131],[0.6933,0.6064],[0.6858,0.5961],[0.6754,0.5889],[0.6679,0.5871]],[[0.2484,0.5852],[0.2192,0.5859],[0.2032,0.5883],[0.1863,0.5931],[0.1703,0.6004],[0.1599,0.607],[0.1486,0.6167],[0.1402,0.627],[0.1317,0.6475],[0.1317,0.6608],[0.1364,0.6735],[0.1496,0.688],[0.1627,0.6959],[0.1797,0.7019],[0.2117,0.7068],[0.2371,0.7062],[0.2587,0.7025],[0.2756,0.6971],[0.2888,0.6904],[0.301,0.6814],[0.3133,0.6675],[0.3217,0.6463],[0.3217,0.6312],[0.3161,0.6167],[0.3067,0.6058],[0.2963,0.5985],[0.2719,0.5895]],[[0.3819,0.5774],[0.3706,0.581],[0.3575,0.5901],[0.3518,0.5985],[0.3518,0.6094],[0.3584,0.6197],[0.3706,0.6288],[0.381,0.6324],[0.3951,0.633],[0.4064,0.6306],[0.4149,0.6252],[0.4205,0.6155],[0.4205,0.6034],[0.4167,0.5937],[0.4083,0.584],[0.396,0.578]],[[0.5024,0.5798],[0.4854,0.5901],[0.477,0.6052],[0.4788,0.6191],[0.4892,0.6318],[0.5005,0.6391],[0.5118,0.6439],[0.539,0.6499],[0.555,0.6505],[0.5673,0.6493],[0.588,0.6427],[0.6011,0.6324],[0.6068,0.6215],[0.6058,0.6064],[0.6002,0.5967],[0.5917,0.5889],[0.5767,0.581],[0.5513,0.575],[0.524,0.575]],[[0.1223,0.5756],[0.1138,0.5726],[0.1007,0.5726],[0.0875,0.5768],[0.0771,0.5834],[0.0696,0.5913],[0.0659,0.5998],[0.0668,0.6058],[0.0715,0.6112],[0.0856,0.6155],[0.1025,0.6155],[0.1148,0.6125],[0.1214,0.6088],[0.1289,0.601],[0.1317,0.5943],[0.1317,0.5852]],[[0.8824,0.5701],[0.8749,0.5726],[0.8674,0.5786],[0.8655,0.5834],[0.8664,0.5913],[0.8702,0.5967],[0.8796,0.6022],[0.8862,0.604],[0.8965,0.604],[0.9031,0.6022],[0.9097,0.5979],[0.9135,0.5919],[0.9135,0.5834],[0.9097,0.578],[0.9012,0.5726],[0.8928,0.5701]],[[0.4243,0.5363],[0.4177,0.5411],[0.4158,0.5447],[0.4167,0.5556],[0.4243,0.5641],[0.4327,0.5689],[0.4478,0.5726],[0.4581,0.5719],[0.4666,0.5689],[0.4722,0.5623],[0.4732,0.555],[0.4657,0.5429],[0.4591,0.5387],[0.4487,0.5351],[0.4365,0.5339]],[[0.5936,0.532],[0.5833,0.5375],[0.5757,0.5453],[0.5748,0.5514],[0.5804,0.5593],[0.5889,0.5641],[0.6049,0.5683],[0.6209,0.5683],[0.6359,0.5641],[0.6444,0.5574],[0.6444,0.5514],[0.6303,0.5357],[0.6256,0.5326],[0.6134,0.5296],[0.6049,0.5296]],[[0.317,0.5],[0.2963,0.5042],[0.2813,0.5127],[0.2719,0.5248],[0.2709,0.5387],[0.2775,0.5496],[0.2935,0.5605],[0.3104,0.5653],[0.3293,0.5659],[0.3481,0.5617],[0.365,0.5514],[0.3725,0.5411],[0.3735,0.5278],[0.3669,0.5169],[0.3547,0.5079],[0.3349,0.5012]],[[0.8467,0.4541],[0.8278,0.4492],[0.8137,0.4474],[0.7902,0.4468],[0.7639,0.4492],[0.7479,0.4522],[0.7215,0.4601],[0.7046,0.468],[0.6914,0.4764],[0.683,0.4843],[0.6745,0.497],[0.6726,0.5054],[0.6736,0.52],[0.6811,0.5363],[0.6943,0.549],[0.7056,0.5562],[0.7206,0.5629],[0.7432,0.5689],[0.7648,0.5713],[0.793,0.5713],[0.8071,0.5701],[0.8325,0.5653],[0.8598,0.5556],[0.8758,0.5466],[0.8871,0.5369],[0.8956,0.5248],[0.8984,0.5157],[0.8975,0.4988],[0.8928,0.4879],[0.8805,0.4734],[0.8645,0.4619]],[[0.7996,0.3724],[0.7902,0.3785],[0.7855,0.3839],[0.7817,0.3978],[0.7893,0.4117],[0.8034,0.4214],[0.8269,0.4287],[0.8523,0.4299],[0.8692,0.4262],[0.8805,0.4202],[0.8899,0.4087],[0.8909,0.396],[0.8843,0.3839],[0.8721,0.3748],[0.8579,0.3694],[0.8391,0.3664],[0.8203,0.367]],[[0.301,0.4045],[0.2926,0.4208],[0.2916,0.4335],[0.2954,0.442],[0.3039,0.4516],[0.317,0.4595],[0.3283,0.4631],[0.3688,0.4698],[0.3857,0.4746],[0.4073,0.4873],[0.4205,0.4982],[0.4412,0.5115],[0.4628,0.5218],[0.4845,0.5278],[0.5052,0.5284],[0.5136,0.5272],[0.5607,0.5127],[0.5964,0.5073],[0.6115,0.503],[0.6256,0.497],[0.6425,0.4861],[0.651,0.4782],[0.6604,0.4643],[0.6604,0.4498],[0.6491,0.4353],[0.6388,0.4287],[0.6115,0.4178],[0.5823,0.3966],[0.5607,0.3833],[0.54,0.3755],[0.5118,0.3688],[0.4873,0.3652],[0.4713,0.3646],[0.4026,0.3773],[0.3612,0.3767],[0.3396,0.3785],[0.3283,0.3815],[0.317,0.3881]],[[0.5607,0.3295],[0.5466,0.3368],[0.5409,0.3428],[0.54,0.3513],[0.5428,0.3555],[0.555,0.3628],[0.5701,0.3664],[0.5861,0.3664],[0.6002,0.3622],[0.6077,0.3573],[0.6087,0.3495],[0.5974,0.3362],[0.5908,0.3313],[0.5814,0.3283],[0.571,0.3277]],[[0.8711,0.3005],[0.8561,0.3053],[0.8485,0.3126],[0.8467,0.3162],[0.8485,0.3331],[0.857,0.3452],[0.8721,0.3561],[0.8862,0.3603],[0.8984,0.3597],[0.9125,0.3531],[0.9219,0.3428],[0.9257,0.3325],[0.9238,0.3235],[0.9163,0.3138],[0.904,0.3059],[0.8881,0.3005]],[[0.793,0.2588],[0.7817,0.2557],[0.7611,0.2557],[0.7291,0.2642],[0.6896,0.2836],[0.6726,0.295],[0.6548,0.3114],[0.6397,0.3343],[0.6359,0.3464],[0.635,0.3609],[0.6416,0.3821],[0.651,0.393],[0.6651,0.4015],[0.6764,0.4045],[0.6905,0.4051],[0.7018,0.4033],[0.7168,0.3978],[0.7535,0.3748],[0.7836,0.347],[0.8015,0.3222],[0.8137,0.2938],[0.8137,0.2799],[0.8109,0.2733],[0.8034,0.2648]],[[0.3358,0.2533],[0.3283,0.2539],[0.3151,0.26],[0.2954,0.2836],[0.2662,0.3077],[0.2559,0.3204],[0.254,0.3331],[0.2596,0.3464],[0.2719,0.3567],[0.2926,0.364],[0.3151,0.3652],[0.3396,0.3597],[0.3565,0.3489],[0.3641,0.3374],[0.3669,0.3265],[0.365,0.3108],[0.3509,0.2896],[0.3452,0.2642]],[[0.8946,0.2424],[0.8871,0.2443],[0.8777,0.2515],[0.8749,0.2582],[0.8758,0.2672],[0.8805,0.2751],[0.8899,0.2817],[0.9022,0.2854],[0.9106,0.2854],[0.9191,0.283],[0.9257,0.2787],[0.9304,0.2703],[0.9304,0.2618],[0.9257,0.2533],[0.9153,0.2461],[0.9031,0.2424]],[[0.2446,0.2364],[0.2352,0.2388],[0.2277,0.2437],[0.222,0.2539],[0.222,0.2624],[0.2258,0.269],[0.2324,0.2745],[0.2427,0.2781],[0.2531,0.2781],[0.2596,0.2763],[0.27,0.2684],[0.2738,0.2545],[0.2681,0.2449],[0.2606,0.2394],[0.2531,0.237]],[[0.2465,0.1953],[0.2446,0.2025],[0.2521,0.2122],[0.2625,0.2189],[0.2794,0.2261],[0.2992,0.231],[0.3142,0.231],[0.3236,0.2279],[0.3302,0.2225],[0.334,0.2146],[0.3321,0.2037],[0.3264,0.1983],[0.3189,0.1947],[0.3029,0.1904],[0.2756,0.1886],[0.2549,0.1911]],[[0.3951,0.1832],[0.3838,0.1874],[0.3735,0.1941],[0.3631,0.2056],[0.3594,0.2134],[0.3594,0.2273],[0.3631,0.2364],[0.3735,0.2479],[0.3895,0.2576],[0.4111,0.2678],[0.4271,0.2799],[0.4374,0.2963],[0.4468,0.3253],[0.4572,0.3374],[0.4685,0.3434],[0.4798,0.3464],[0.4967,0.347],[0.5052,0.3458],[0.5202,0.3398],[0.5287,0.3325],[0.5325,0.3265],[0.5334,0.318],[0.5278,0.3083],[0.4901,0.2848],[0.4713,0.266],[0.4666,0.2563],[0.4657,0.2449],[0.4751,0.2183],[0.4732,0.2019],[0.4694,0.1971],[0.4591,0.1904],[0.4412,0.1838],[0.4214,0.1808],[0.4102,0.1808]],[[0.1373,0.1663],[0.1308,0.1693],[0.1232,0.1778],[0.1204,0.185],[0.1204,0.1965],[0.143,0.2297],[0.1468,0.24],[0.1468,0.2539],[0.1392,0.2696],[0.1082,0.3077],[0.1035,0.318],[0.1025,0.3295],[0.1091,0.3458],[0.1392,0.3863],[0.1421,0.3948],[0.1421,0.4063],[0.1373,0.4184],[0.1279,0.4317],[0.0903,0.4686],[0.0762,0.4849],[0.0677,0.5024],[0.0677,0.5139],[0.0743,0.5266],[0.0828,0.5345],[0.0978,0.5429],[0.1251,0.5502],[0.1693,0.5514],[0.2004,0.5466],[0.2201,0.5393],[0.2324,0.532],[0.2455,0.5181],[0.2484,0.5103],[0.2484,0.4976],[0.2389,0.4752],[0.2173,0.4474],[0.207,0.4281],[0.207,0.3894],[0.2032,0.3773],[0.1929,0.3628],[0.1684,0.3386],[0.1627,0.3247],[0.1637,0.312],[0.1675,0.3029],[0.1891,0.2757],[0.1976,0.2618],[0.1994,0.2533],[0.1976,0.243],[0.1834,0.2249],[0.1496,0.1941],[0.1458,0.1856],[0.1458,0.1687],[0.143,0.1663]],[[0.1486,0.0913],[0.1373,0.0919],[0.1298,0.0949],[0.1195,0.1028],[0.1148,0.1106],[0.1138,0.1215],[0.1167,0.1336],[0.1232,0.1427],[0.1336,0.1475],[0.1439,0.1475],[0.1562,0.1439],[0.1627,0.1391],[0.1665,0.1312],[0.1675,0.1173],[0.1646,0.107],[0.1571,0.0955]],[[0.81,0.055],[0.7949,0.0641],[0.7865,0.075],[0.7865,0.084],[0.794,0.0937],[0.8043,0.1004],[0.8147,0.1046],[0.8335,0.1088],[0.8551,0.1088],[0.8758,0.1028],[0.8862,0.0955],[0.8881,0.0871],[0.8786,0.0726],[0.8655,0.0605],[0.8551,0.0544],[0.8382,0.0508],[0.8241,0.0514]],[[0.3754,0.0526],[0.3434,0.0472],[0.3104,0.0478],[0.2832,0.0538],[0.2606,0.0659],[0.2474,0.0786],[0.2342,0.0961],[0.2258,0.1112],[0.222,0.1227],[0.2211,0.1324],[0.2239,0.1427],[0.2295,0.1505],[0.238,0.1572],[0.2578,0.1651],[0.2813,0.1699],[0.2982,0.1717],[0.3321,0.1717],[0.3622,0.1675],[0.3866,0.1608],[0.4036,0.1536],[0.4205,0.1427],[0.4318,0.1306],[0.4365,0.1203],[0.4384,0.0992],[0.4356,0.0889],[0.4271,0.0768],[0.4167,0.0689],[0.4008,0.0611]],[[0.4986,0.055],[0.4929,0.0647],[0.4929,0.0768],[0.4958,0.0846],[0.5089,0.1034],[0.5259,0.1197],[0.5315,0.1294],[0.5306,0.1391],[0.5249,0.1457],[0.5024,0.162],[0.4986,0.1687],[0.4986,0.1741],[0.5033,0.1814],[0.5118,0.1874],[0.5579,0.2037],[0.5691,0.2122],[0.5757,0.2237],[0.5757,0.2376],[0.5729,0.2485],[0.5738,0.2666],[0.5804,0.2757],[0.5917,0.2823],[0.6049,0.286],[0.6246,0.2866],[0.6378,0.2836],[0.6482,0.2787],[0.6623,0.2672],[0.6707,0.2563],[0.6849,0.2304],[0.6971,0.214],[0.715,0.2007],[0.7262,0.1965],[0.746,0.1953],[0.7545,0.1971],[0.7987,0.217],[0.8241,0.2225],[0.8429,0.2225],[0.8598,0.2195],[0.8739,0.214],[0.8843,0.2068],[0.8899,0.1959],[0.8881,0.1814],[0.8777,0.1663],[0.8636,0.1542],[0.8344,0.1391],[0.81,0.1318],[0.7705,0.1252],[0.7582,0.1209],[0.7488,0.1149],[0.7422,0.1028],[0.7432,0.0738],[0.7375,0.0641],[0.7262,0.0568],[0.7074,0.0526],[0.6886,0.0544],[0.6698,0.0617],[0.635,0.0834],[0.6199,0.0877],[0.604,0.0877],[0.5898,0.0828],[0.5786,0.0756],[0.556,0.0556],[0.5372,0.0459],[0.5315,0.0447],[0.5165,0.0453],[0.5089,0.0478]],[[0.158,0.0459],[0.1458,0.0447],[0.1336,0.0502],[0.127,0.0586],[0.1279,0.0647],[0.1317,0.0671],[0.1486,0.0683],[0.1599,0.0635],[0.1637,0.058],[0.1637,0.0508]]];

const W = 12, D = W / .6427;                     // sheet keeps the guide frame's proportions
// The sheet lies on a closed laptop (lid up, with the brand's ä logo) on the table.
const GROUND = -1.6, LAPTOP_T = .62, LAPTOP_W = 13.6, LAPTOP_D = LAPTOP_W * 1.43;
const SHEET_T = .22, SHEET_Y = GROUND + LAPTOP_T, TOP = SHEET_Y + SHEET_T;
const FALL_H = 11, GRAVITY = 30, INTERVAL = .42, START_DELAY = .35;
// Epoxy tint per puddle, read from the guide (물방울에폭시시안, low opacity): [colour, strength].
const TINTS = [["#8dc5d4",0.052],["#a2d9d0",0.152],["#8dc5d4",0.052],["#8dc5d4",0.088],["#83cdd9",0.104],["#83cdd9",0.104],["#a2d9d0",0.152],["#8dc5d4",0.149],["#8dc5d4",0.138],["#8dc5d4",0.104],["#8dc5d4",0.149],["#8dc5d4",0.104],["#8dc5d4",0.052],["#8dc5d4",0.149],["#8dc5d4",0.052],["#8dc5d4",0.052],["#83cdd9",0.104],["#83cdd9",0.104],["#83cdd9",0.057],["#a2d9d0",0.152],["#8dc5d4",0.104],["#8dc5d4",0.052],["#8dc5d4",0.052],["#83cdd9",0.104],["#8dc5d4",0.104],["#b4d4d3",0.215],["#a2d9d0",0.152],["#83cdd9",0.057],["#b4d4d3",0.215],["#b4d4d3",0.126],["#83cdd9",0.126],["#8dc5d4",0.052],["#8dc5d4",0.052],["#8dc5d4",0.143],["#8dc5d4",0.104],["#a2d9d0",0.1],["#a2d9d0",0.1],["#83cdd9",0.104],["#71a4c5",0.099],["#8dc5d4",0.052],["#a2d9d0",0.1]];

export function createDropletIsland(scene, island) {
  const root = new THREE.Group(); root.name = 'island-drops'; scene.add(root);
  const obstacles = [];

  // Thin clear acrylic sheet with softly rounded corners.
  const sheetShape = roundedRect(W, D, .45);
  const sheetGeo = new THREE.ExtrudeGeometry(sheetShape, { depth: SHEET_T - .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 10 });
  sheetGeo.rotateX(-Math.PI / 2); sheetGeo.translate(0, SHEET_Y + .02, 0);
  // Clear acrylic: nearly invisible face-on, a cool sheen and bright edges where the
  // surface turns away, like a real sheet seen on a white table.
  const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, depthWrite: false, roughness: .04, ior: 1.49, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.4 });
  acrylic.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      vec3 V = normalize(vViewPosition);
      vec3 up = normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz);
      // two fixed sparkle lights: the overhead lamp and a soft one from the front right
      vec3 L1 = normalize((viewMatrix * vec4(-.24, .88, .42, 0.)).xyz), L2 = normalize((viewMatrix * vec4(.45, .6, .66, 0.)).xyz);
      float fres = pow(1.0 - saturate(abs(dot(normal, V))), 4.0);
      // polished cut edges glow pale green-cyan, like real acrylic
      float side = smoothstep(.55, .9, 1.0 - abs(dot(normal, up)));
      float sp = pow(max(dot(normal, normalize(L1 + V)), 0.), 90.) * .55 + pow(max(dot(normal, normalize(L2 + V)), 0.), 40.) * .25;
      vec3 col = mix(vec3(.9, .95, .96), vec3(.52, .84, .80), side);
      col = mix(col, vec3(1.), fres * .5) + sp;
      gl_FragColor = vec4(col, saturate(.03 + side * .78 + fres * .38 + min(sp, 1.) * .7));`);
  };
  const sheet = new THREE.Mesh(sheetGeo, acrylic); sheet.renderOrder = 1; root.add(sheet);
  const laptop = createLaptop(root);

  // Water: clear epoxy-like lenses with the guide's faint cyan/mint tint. Every drop gets
  // its own material (same shader source, so they share one compiled program) carrying
  // its tint as uniforms: tinted in the middle, a deeper rim where the surface curves
  // away, and bright glints.
  const waterShader = (tint, strength) => shader => {
    shader.uniforms.uTint = { value: tint }; shader.uniforms.uStrength = { value: strength };
    shader.fragmentShader = 'uniform vec3 uTint;\nuniform float uStrength;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      vec3 V = normalize(vViewPosition);
      vec3 up = normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz);
      // two fixed sparkle lights: the overhead lamp and a soft one from the front right
      vec3 L1 = normalize((viewMatrix * vec4(-.24, .88, .42, 0.)).xyz), L2 = normalize((viewMatrix * vec4(.45, .6, .66, 0.)).xyz);
      float fres = pow(1.0 - saturate(abs(dot(normal, V))), 4.0);
      // Fake refraction of a drop on a surface: the steep outer wall bends in the dark
      // surroundings (a dark outline), the light focuses into a bright band just inside
      // it (caustic), the flat top stays clear, and two sharp sparkles from the lights.
      float slope = 1.0 - saturate(dot(normal, up));
      float edge = smoothstep(.45, .85, slope);
      float caustic = smoothstep(.05, .18, slope) * (1.0 - smoothstep(.3, .5, slope));
      float sp = pow(max(dot(normal, normalize(L1 + V)), 0.), 420.) * 3.0 + pow(max(dot(normal, normalize(L2 + V)), 0.), 160.) * 1.2;
      vec3 col = mix(uTint, uTint * vec3(.36, .46, .5), edge);
      col = mix(col, vec3(1.15, 1.15, 1.12), caustic * .75);
      col = mix(col, vec3(.95, .98, 1.), fres * .55) + sp;
      gl_FragColor = vec4(col, saturate(uStrength * 2.0 + edge * .7 + caustic * .45 + fres * .3 + min(sp, 1.) * .9));`);
  };
  const waterMaterial = (hex, strength) => {
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, roughness: .03, ior: 1.33, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.8 });
    m.onBeforeCompile = waterShader(new THREE.Color(hex), strength);
    return m;
  };
  const water = waterMaterial('#8dc5d4', .08);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1d2a30, transparent: true, opacity: 0, depthWrite: false });
  const ball = new THREE.SphereGeometry(1, 20, 14), disc = new THREE.CircleGeometry(1, 28); disc.rotateX(-Math.PI / 2);

  const drops = SHAPES.map((points, index) => {
    const [tintHex, tintStrength] = TINTS[index] ?? ['#8dc5d4', .08];
    const tinted = waterMaterial(tintHex, tintStrength), fallMat = waterMaterial(tintHex, Math.max(.16, tintStrength * 1.6));
    const pts = points.map(([u, v]) => new THREE.Vector2((u - .5) * W, (v - .5) * D * -1)); // shape y = -z
    const shape = new THREE.Shape(pts);
    let cx = 0, cz = 0; pts.forEach(p => { cx += p.x; cz -= p.y; }); cx /= pts.length; cz /= pts.length;
    const area = Math.abs(THREE.ShapeUtils.area(pts)), size = Math.sqrt(area);
    let reach = 0; pts.forEach(p => { reach = Math.max(reach, Math.hypot(p.x - cx, -p.y - cz)); });
    const h = Math.min(.2, .04 + size * .045), edge = Math.min(h * 1.1, size * .2);   // low, flat puddles
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .005, bevelEnabled: true, bevelThickness: h, bevelSize: edge, bevelOffset: -edge, bevelSegments: 6, curveSegments: 14 });
    geo.rotateX(-Math.PI / 2);
    // flatten the underside so the puddle sits on the sheet
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setY(i, y < 0 ? y * .04 : y); }
    geo.translate(-cx, 0, -cz); geo.computeVertexNormals();
    const puddle = new THREE.Mesh(geo, tinted); puddle.position.set(cx, TOP + .004, cz); puddle.castShadow = true; puddle.renderOrder = 2; root.add(puddle);
    const r = THREE.MathUtils.clamp(size * .3, .1, .6);
    const falling = new THREE.Mesh(ball, fallMat); falling.castShadow = true; falling.renderOrder = 3; root.add(falling);
    const blob = new THREE.Mesh(ball, tinted); blob.castShadow = true; blob.renderOrder = 2; root.add(blob);
    const mark = new THREE.Mesh(disc, shadowMat.clone()); mark.position.set(cx, TOP + .006, cz); mark.scale.setScalar(Math.max(r, reach * .5)); mark.visible = false; root.add(mark);
    return { cx, cz, reach, r, puddle, falling, blob, mark, t0: 0, state: 'wait' };
  });

  // Splash: a few tiny droplets flung out on impact.
  const sprayGeo = new THREE.SphereGeometry(1, 10, 8), spray = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(sprayGeo, water); m.scale.setScalar(1e-4); root.add(m); spray.push({ m, v: new THREE.Vector3(), life: 0 }); }
  let sprayNext = 0;
  const splash = (x, z, r) => {
    for (let i = 0; i < 6; i++) {
      const s = spray[sprayNext++ % spray.length], a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      s.m.position.set(x + Math.cos(a) * r * .6, TOP + .05, z + Math.sin(a) * r * .6); s.m.scale.setScalar(.03 + Math.random() * .05);
      s.v.set(Math.cos(a) * sp, 2.5 + Math.random() * 2.5, Math.sin(a) * sp); s.life = .55;
    }
  };

  // The swim bear, walking on the sheet (its own swimming code is not used here).
  const bear = createSwimBear(root, { x: 0, z: 0 });
  const { arms, legs, head, rings } = bear.parts; rings.forEach(r => { r.visible = false; });
  const body = bear.object; body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
  const bearBox = new THREE.Box3().setFromObject(body), footOffset = body.position.y - bearBox.min.y;
  const bearMid = (bearBox.max.y + bearBox.min.y) / 2 - body.position.y;   // centre height above the origin
  // shown as the Alltäglich swim bear plush; the walker / stunt code below moves it
  const plush = replaceWithPlush(root, body, 'swim');
  const walker = { x: 0, z: 2, vx: 0, vz: 0, yaw: 0, phase: 0, target: new THREE.Vector2(0, 2), flinch: 0, act: null, cool: 0, lastAct: '' };
  body.rotation.order = 'YXZ';   // yaw first, then pitch/roll in the bear's own frame (for flips)
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

  const HIDE = 1e-4, hide = m => m.scale.setScalar(HIDE);
  let start = null, last = null, order = [];
  const reset = time => {
    start = time; order = drops.map((_, i) => i).sort(() => Math.random() - .5);
    order.forEach((i, k) => { const d = drops[i]; d.t0 = START_DELAY + k * INTERVAL; d.state = 'wait'; hide(d.puddle); hide(d.falling); hide(d.blob); d.mark.visible = false; });
    walker.x = 0; walker.z = 2; walker.vx = walker.vz = 0; walker.act = null; walker.cool = 0; newTarget();
  };

  const house = createDogHouse(root, obstacles, { x: 0, z: D / 2 + 3, y: GROUND });
  const toy = createFetchToy(root, { x: 0, y: GROUND + .17, z: D / 2 + 2 }, island.spawn);
  house.object.visible = false; toy.ball.visible = false;

  let pendingReset = false;
  const world = {
    // replay from the start every time the island is opened
    onEnter() { pendingReset = true; },
    // compile every shader up front so the first drops never wait on the GPU
    precompile(renderer, scene, camera) {
      const was = root.visible; root.visible = true;
      try { const job = renderer.compileAsync(root, camera, scene); root.visible = was; return job.catch(() => {}); }
      catch { root.visible = was; return Promise.resolve(); }
    },
    root, island, obstacles, house, fetchActivity: toy, bear, drops,
    // opens looking across the laptop's long side (landscape diagonal)
    viewDirection: new THREE.Vector3(29, 23, -15).normalize(),
    // brushed-silver reflections for the laptop only
    setupEnvironment(renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer), tex = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
      for (const m of laptop.materials) { m.envMap = tex; m.needsUpdate = true; }
    },
    navigationOptions: { bounds: { minX: -W / 2 + .5, maxX: W / 2 - .5, minZ: -D / 2 + .5, maxZ: D / 2 - .5 }, clearance: .6, min: -11, size: 60 },
    activity: { type: 'none' },
    grabTargets: [{ object: body, grab() {}, drag() {}, release() {}, tap() { plush.open(); } }],
    view: { center: { x: 0, z: 0 }, min: [-LAPTOP_W / 2 - .2, GROUND, -LAPTOP_D / 2 - .2], max: [LAPTOP_W / 2 + .2, 2.6, LAPTOP_D / 2 + .2] },
    ready: Promise.resolve(),
    heightAt(x, z) { return Math.abs(x) <= W / 2 && Math.abs(z) <= D / 2 ? TOP : GROUND; },
    get finished() { return drops.every(d => d.state === 'landed'); },
    get stunt() { return walker.act?.type ?? null; },
    update(time, reducedMotion) {
      if (start === null || pendingReset) { pendingReset = false; reset(time); }
      const dt = last === null ? 0 : Math.min(.05, Math.max(0, time - last)); last = time;
      const t = time - start;
      for (const d of drops) {
        if (d.state === 'wait' && t >= d.t0) { d.state = 'falling'; d.mark.visible = true; }
        if (d.state === 'falling') {
          // an oval drop, stretched along its fall
          const ft = t - d.t0, y = FALL_H - .5 * GRAVITY * ft * ft, k = Math.min(1, ft / Math.sqrt(2 * FALL_H / GRAVITY));
          d.falling.scale.set(d.r * .8, d.r * (1.35 + .35 * k), d.r * .8);
          d.falling.position.set(d.cx, TOP + d.r * 1.5 + Math.max(0, y), d.cz);
          d.mark.material.opacity = .05 + .2 * k; d.mark.scale.setScalar(Math.max(d.r, d.reach * .5) * (1.6 - .6 * k));
          if (y <= 0 || reducedMotion) {
            d.state = 'splat'; d.splatAt = t; hide(d.falling); d.mark.visible = false;
            if (!reducedMotion) splash(d.cx, d.cz, d.reach);
            if (Math.hypot(walker.x - d.cx, walker.z - d.cz) < d.reach + .5) walker.flinch = .6;
          }
        }
        if (d.state === 'splat') {
          // the oval squashes into a round blob, then flows out into the puddle's shape
          const s = t - d.splatAt, a = Math.min(1, s / .18), b = Math.max(0, Math.min(1, (s - .1) / .8));
          const ease = 1 - Math.pow(1 - b, 3), wobble = Math.exp(-b * 5) * Math.sin(b * 14) * .06;
          const blobR = d.r * (1 + .7 * a) * (1 - ease);
          if (blobR > .01) { d.blob.scale.set(blobR, d.r * (1.4 - 1.1 * a) * (1 - ease) + .02, blobR); d.blob.position.set(d.cx, TOP + d.blob.scale.y * .5, d.cz); } else hide(d.blob);
          const spread = Math.max(HIDE, .25 + .75 * ease + wobble);
          d.puddle.scale.set(spread, Math.max(HIDE, b > 0 ? .6 + .4 * ease : HIDE), spread);
          if (s > .95 || reducedMotion) { d.state = 'landed'; d.puddle.scale.set(1, 1, 1); hide(d.blob); }
        }
      }
      for (const s of spray) if (s.life > 0) {
        s.life -= dt; s.v.y -= 18 * dt; s.m.position.addScaledVector(s.v, dt);
        if (s.m.position.y < TOP + .02) { s.m.position.y = TOP + .02; s.v.set(0, 0, 0); }
        if (s.life <= 0) s.m.scale.setScalar(1e-4);
      }
      updateBear(time, dt, t, reducedMotion);
      plush.update(plush.anchor);
    },
    setMood() {},
  };

  function updateBear(time, dt, t, reducedMotion) {
    let ax = 0, az = 0, danger = 0, threat = null;
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
            // a drop about to land right next to the bear: time for a stunt
            if (left < .7 && dist < d.reach + 1.6 && (!threat || left < threat.left)) threat = { left, dx: dx / dist, dz: dz / dist };
          }
        } else if (d.state !== 'wait' && dist < d.reach + .45) { const push = (d.reach + .45 - dist) * 2; ax += dx / dist * push; az += dz / dist * push; }
      }
      // stay on the sheet
      if (Math.abs(walker.x) > LIMIT_X) ax -= Math.sign(walker.x) * (Math.abs(walker.x) - LIMIT_X) * 6;
      if (Math.abs(walker.z) > LIMIT_Z) az -= Math.sign(walker.z) * (Math.abs(walker.z) - LIMIT_Z) * 6;
      if (danger > .2 && Math.random() < .02) newTarget();
    }
    walker.cool = Math.max(0, walker.cool - dt);
    // Spectacular dodges: forward roll, cartwheel, front flip or a spinning star jump,
    // launched away from the drop that is about to land.
    if (!walker.act && threat && walker.cool <= 0 && !reducedMotion) {
      // pick the launch direction that ends farthest from every drop still in the air
      let dx = threat.dx, dz = threat.dz, best = -1e9;
      for (let k = 0; k < 16; k++) {
        const a = Math.atan2(threat.dx, threat.dz) + (k / 16) * Math.PI * 2, cx = Math.sin(a), cz = Math.cos(a);
        const ex = walker.x + cx * 2.3, ez = walker.z + cz * 2.3;
        let score = -Math.abs(k / 16 - .5) * .4;   // mild preference for straight away from the threat
        if (Math.abs(ex) > LIMIT_X || Math.abs(ez) > LIMIT_Z) score -= 50;
        for (const d of drops) if (d.state === 'falling' || (d.state === 'wait' && d.t0 - t < 1)) {
          const gap = Math.min(Math.hypot(ex - d.cx, ez - d.cz), Math.hypot(walker.x + cx * 1.2 - d.cx, walker.z + cz * 1.2 - d.cz)) - d.reach;
          score += Math.min(0, gap - .9) * 6;
        }
        if (score > best) { best = score; dx = cx; dz = cz; }
      }
      const kinds = ['roll', 'cartwheel', 'flip', 'star'].filter(k => k !== walker.lastAct), type = kinds[Math.floor(Math.random() * kinds.length)];
      const dur = { roll: .62, cartwheel: .78, flip: .72, star: .8 }[type], dist = { roll: 2.3, cartwheel: 2.4, flip: 2.2, star: 2.0 }[type];
      const dirYaw = Math.atan2(dx, dz), side = Math.random() < .5 ? -1 : 1;
      // a cartwheel travels sideways, so the bear faces across its path
      const yaw = type === 'cartwheel' ? dirYaw - side * Math.PI / 2 : dirYaw;
      walker.act = { type, t: 0, dur, dx, dz, speed: dist / dur, yaw0: walker.yaw, yaw, side };
      walker.lastAct = type; walker.flinch = 0;
    }
    if (walker.act) { animateStunt(time, dt); return; }
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
    body.rotation.set(run * .25 + walker.flinch * .2, walker.yaw, Math.sin(walker.phase) * .06 * stride, 'YXZ');
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


  function animateStunt(time, dt) {
    const a = walker.act; a.t += dt;
    const p = Math.min(1, a.t / a.dur), e = p * p * (3 - 2 * p), spin = e * Math.PI * 2;
    walker.x = THREE.MathUtils.clamp(walker.x + a.dx * a.speed * dt * (1.25 - p * .5), -W / 2 + .5, W / 2 - .5);
    walker.z = THREE.MathUtils.clamp(walker.z + a.dz * a.speed * dt * (1.25 - p * .5), -D / 2 + .5, D / 2 - .5);
    walker.vx = a.dx * 1.2; walker.vz = a.dz * 1.2;
    let dy = a.yaw - a.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    walker.yaw = a.yaw0 + dy * Math.min(1, p * 5);
    const arc = Math.sin(p * Math.PI), c = bearMid;
    let pitch = 0, roll = 0, lift = 0, twist = 0, squash = 1;
    const side = a.side;
    if (a.type === 'roll') {
      // tuck, tip forward over the head and come up on the feet
      pitch = spin; lift = arc * .25 - .22 * Math.sin(p * Math.PI); squash = 1 - arc * .18;
      arms.forEach((arm, i) => { arm.rotation.x = -2.9; arm.rotation.z = (i ? 1 : -1) * .25; });
      legs.forEach(leg => { leg.rotation.x = -1.4 * arc; leg.rotation.z = 0; });
      head.rotation.x = .55 * arc;
    } else if (a.type === 'cartwheel') {
      roll = side * spin; lift = arc * .55;
      arms.forEach((arm, i) => { arm.rotation.x = 0; arm.rotation.z = (i ? 1 : -1) * 2.7; });
      legs.forEach((leg, i) => { leg.rotation.x = 0; leg.rotation.z = (i ? 1 : -1) * .75 * arc; });
      head.rotation.x = 0;
    } else if (a.type === 'flip') {
      // spring up, front somersault in the air, land
      pitch = THREE.MathUtils.smoothstep(p, .12, .88) * Math.PI * 2; lift = arc * 2.3;
      const tuck = Math.sin(THREE.MathUtils.smoothstep(p, .1, .9) * Math.PI);
      arms.forEach((arm, i) => { arm.rotation.x = -2.8 + tuck * .6; arm.rotation.z = (i ? 1 : -1) * (.3 + .3 * (1 - tuck)); });
      legs.forEach(leg => { leg.rotation.x = -1.5 * tuck; leg.rotation.z = 0; });
      head.rotation.x = .4 * tuck;
    } else {
      // star jump with a full twist
      twist = THREE.MathUtils.smoothstep(p, .08, .9) * Math.PI * 2 * a.side; lift = arc * 2.6; pitch = -.15 * arc;
      arms.forEach((arm, i) => { arm.rotation.x = -.2; arm.rotation.z = (i ? 1 : -1) * (.4 + 2.0 * arc); });
      legs.forEach((leg, i) => { leg.rotation.x = 0; leg.rotation.z = (i ? 1 : -1) * .8 * arc; });
      head.rotation.x = -.3 * arc;
    }
    // little crouch on take-off and landing
    const crouch = Math.max(0, 1 - p / .12) * .12 + Math.max(0, (p - .9) / .1) * .1;
    // flips turn round the bear's middle, not its origin
    const ox = c * Math.sin(roll), oy = c * (1 - Math.cos(pitch) * Math.cos(roll)), oz = -c * Math.sin(pitch);
    const sy = Math.sin(walker.yaw + twist), cy = Math.cos(walker.yaw + twist);
    body.position.set(walker.x + ox * cy + oz * sy, TOP + footOffset + lift + oy - crouch, walker.z - ox * sy + oz * cy);
    body.rotation.set(pitch, walker.yaw + twist, roll, 'YXZ');
    body.scale.set(1.32 / Math.sqrt(squash), 1.32 * squash, 1.32 / Math.sqrt(squash));
    if (p >= 1) { walker.act = null; walker.cool = .9; walker.phase = 0; body.rotation.set(0, walker.yaw, 0, 'YXZ'); }
  }
  return world;
}

function roundedRect(w, d, r) {
  const s = new THREE.Shape(), x = w / 2, y = d / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

// A closed aluminium laptop, lid up, long side along the sheet. The lid carries the
// Alltäglich ä mark (drawn as vector shapes, traced from the brand logo).
function createLaptop(root) {
  const alu = new THREE.MeshStandardMaterial({ color: 0xc4c7cb, metalness: .9, roughness: .36, envMapIntensity: .75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x8a8e93, metalness: .6, roughness: .5 });
  const slab = (t, r, y, mat, inset = 0) => {
    const g = new THREE.ExtrudeGeometry(roundedRect(LAPTOP_W - inset, LAPTOP_D - inset, r), { depth: t - .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 12 });
    g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y + .02; m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  };
  const baseT = LAPTOP_T * .56, lidT = LAPTOP_T * .4;
  slab(baseT, .7, GROUND, alu);                         // base
  slab(LAPTOP_T * .04, .68, GROUND + baseT, dark, .12);  // the dark seam between base and lid
  slab(lidT, .7, GROUND + baseT + LAPTOP_T * .04, alu); // lid
  // rubber feet peeking out underneath
  for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .04, 20), dark); f.position.set(fx * (LAPTOP_W / 2 - 1), GROUND + .01, fz * (LAPTOP_D / 2 - 1.2)); root.add(f);
  }
  // logo: ä — a round bowl, a straight stem on its right and two dots
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'), u = 1024 / 72, X = v => (v + 4) * u, Y = v => (v - 12) * u;
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(X(28), Y(56.5), 24.6 * u, 0, Math.PI * 2); g.arc(X(28), Y(56.5), 15.6 * u, 0, Math.PI * 2, true); g.fill();
  g.fillRect(X(53), Y(32), 9 * u, 49.5 * u);
  for (const dx of [24.5, 40.5]) { g.beginPath(); g.arc(X(dx), Y(19.3), 4.6 * u, 0, Math.PI * 2); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshStandardMaterial({ color: 0x9da2a8, metalness: 1, roughness: .12, envMapIntensity: .9, alphaMap: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  logo.rotation.set(-Math.PI / 2, 0, Math.PI / 2); logo.position.set(0, GROUND + LAPTOP_T + .004, 0); logo.renderOrder = 1; root.add(logo);
  return { materials: [alu, dark, logo.material] };
}
