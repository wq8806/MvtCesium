//TS-GIS
uniform sampler2D u_normalMap;
uniform sampler2D u_refractMap;
//uniform samplerCube u_cubeMap;
uniform sampler2D u_reflectMap;
//uniform sampler2D u_flowMap;
uniform vec4 u_waterColor;
uniform vec4 u_refractColor;
uniform int u_useRefractTex;
uniform vec4 u_reflectColor;
uniform int u_reflection;
uniform vec2 u_flowDir;
varying vec3 eyeDir;
varying vec2 texCoord;
varying float myTime;
varying vec4 projectionCoord;
uniform vec4 czm_pickColor;
void main (void)
{  // texScale determines the amount of tiles generated.
   float texScale = 35.0;
   // texScale2 determines the repeat of the water texture (the normalmap) itself
   float texScale2 = 10.0;
   float myangle;
   float transp;
   vec3 myNormal;
   vec2 mytexFlowCoord = texCoord * texScale;
   // ff is the factor that blends the tiles.
   vec2 ff = abs(2.0*(fract(mytexFlowCoord)) - 1.0) -0.5;
   // take a third power, to make the area with more or less equal contribution
   // of more tile bigger
   ff = 0.5-4.0*ff*ff*ff;
   // ffscale is a scaling factor that compensates for the effect that
   // adding normal vectors together tends to get them closer to the average normal
   // which is a visible effect. For more or less random waves, this factor
   // compensates for it
   vec2 ffscale = sqrt(ff*ff + (1.0-ff)*(1.0-ff));
   vec2 Tcoord = texCoord  * texScale2;     // offset makes the water move
   vec2 offset = vec2(myTime,0.0);
   // I scale the texFlowCoord and floor the value to create the tiling
   // This could have be replace by an extremely lo-res texture lookup
   // using NEAREST pixel.
   vec3 sample = vec3(u_flowDir, 1.0);
   //texture2D( u_flowMap, floor(mytexFlowCoord)/ texScale).rgb;
   // flowdir is supposed to go from -1 to 1 and the line below
   // used to be sample.xy * 2.0 - 1.0, but saves a multiply by
   // moving this factor two to the sample.b
   vec2 flowdir = sample.xy -0.5;
   // sample.b is used for the inverse length of the wave
   // could be premultiplied in sample.xy, but this is easier for editing flowtexture
   flowdir *= sample.b;
   // build the rotation matrix that scales and rotates the complete tile
   mat2 rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);
   // this is the normal for tile A
   vec2 NormalT0 = texture2D(u_normalMap, rotmat * Tcoord - offset).rg;
   // for the next tile (B) I shift by half the tile size in the x-direction
   sample = vec3(u_flowDir, 1.0);
   //texture2D( u_flowMap, floor((mytexFlowCoord + vec2(0.5,0)))/ texScale ).rgb;
   flowdir = sample.b * (sample.xy - 0.5);
   rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);

   vec2 NormalT1 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.06+0.62).rg;
       // blend them together using the ff factor
       // use ff.x because this tile is shifted in the x-direction
   vec2 NormalTAB = ff.x * NormalT0 + (1.0-ff.x) * NormalT1;
       // the scaling of NormalTab and NormalTCD is moved to a single scale of
       // NormalT later in the program, which is mathematically identical to
       // NormalTAB = (NormalTAB - 0.5) / ffscale.x + 0.5;
       // tile C is shifted in the y-direction
   sample = vec3(u_flowDir, 1.0);
       //texture2D( u_flowMap, floor((mytexFlowCoord + vec2(0.0,0.5)))/ texScale ).rgb;
   flowdir = sample.b * (sample.xy - 0.5);
   rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);
   NormalT0 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.33+0.27).rg;
            // tile D is shifted in both x- and y-direction
   sample = vec3(u_flowDir, 1.0);
             //texture2D( u_flowMap, floor((mytexFlowCoord + vec2(0.5,0.5)))/ texScale ).rgb;
   flowdir = sample.b * (sample.xy - 0.5);
   rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);
   NormalT1 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.24).rg ;
   vec2 NormalTCD = ff.x * NormalT0 + (1.0-ff.x) * NormalT1;
                  // NormalTCD = (NormalTCD - 0.5) / ffscale.x + 0.5;
                  // now blend the two values togetherv
   vec2 NormalT = ff.y * NormalTAB + (1.0-ff.y) * NormalTCD;
                  // this line below used to be here for scaling the result
                  //NormalT = (NormalT - 0.5) / ffscale.y + 0.5;
                  // below the new, direct scaling of NormalT
   NormalT = (NormalT - 0.5) / (ffscale.y * ffscale.x);
                   // scaling by 0.3 is arbritrary, and could be done by just
                   // changing the values in the normal map
                   // without this factor, the waves look very strong
   NormalT *= 0.3;    // to make the water more transparent
   transp = 1.0;//texture2D( u_flowMap, texFlowCoord ).a;
                    // and scale the normals with the transparency
   NormalT *= transp*transp;
          // assume normal of plane is 0,0,1 and produce the normalized sum of adding NormalT to it
   myNormal = vec3(NormalT,sqrt(1.0-NormalT.x*NormalT.x - NormalT.y*NormalT.y));
             // 获取反射颜色。
   vec3 envColor = u_reflectColor.rgb;//vec3(0.5647, 0.6941, 0.8235);
   if (u_reflection == 1)    {
       //vec3 reflectDir = reflect(eyeDir, myNormal);
       //vec3 envColor = vec3(textureCube(u_cubeMap, -reflectDir));
       // 如果要实现反射真实场景，需要把场景渲染5遍构建一个无底的立方体纹理。
       // 目前使用一张反射纹理近似模拟。
       vec2 final = projectionCoord.xy / projectionCoord.w;
       final = final * 0.5 + 0.5;
       final.y = 1.0 - final.y;
       envColor = texture2D(u_reflectMap, final + myNormal.xy/texScale2*transp).rgb;
   }
   // very ugly version of fresnel effect
   // but it gives a nice transparent water, but not too transparent
   myangle = dot(myNormal,normalize(eyeDir));
   myangle = 0.95-0.6*myangle*myangle;
   vec3 base = u_refractColor.rgb;//vec3(0.3, 0.4, 0.5);
   if (u_useRefractTex == 1)
   base = texture2D(u_refractMap,(texCoord + myNormal.xy/texScale2*0.03*transp)*32.0).rgb;
   base = mix(base, u_waterColor.rgb, u_waterColor.a);     // 光照计算(暂不加入)
   //vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0)); // 光照方向需要从外面传入
   //vec3 reflectVec = reflect(-lightDir, myNormal);
   //float diffuse = max(0.0, dot(myNormal, lightDir));
   //float spec = max(dot(reflectVec, normalize(-eyeDir)), 0.0);
   //spec = pow(spec, 128.0);
   //float lightIntensity = 0.7 * diffuse + 0.3 * spec;
   gl_FragColor = vec4(mix(base, envColor, myangle*transp), 1.0);
}
