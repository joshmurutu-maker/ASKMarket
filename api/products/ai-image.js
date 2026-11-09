// Authenticated AI product-image generation and upload.
// The OpenAI key stays server-side; the user's Supabase JWT scopes storage uploads.
const json=(res,status,body)=>{res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(body)};
export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return json(res,405,{error:"Method not allowed."})}
  const supabase=process.env.SUPABASE_URL,anon=process.env.SUPABASE_ANON_KEY,openai=process.env.OPENAI_API_KEY;
  if(!supabase||!anon||!openai)return json(res,503,{error:"AI images are not configured. Add SUPABASE_URL, SUPABASE_ANON_KEY and OPENAI_API_KEY in Vercel."});
  const auth=req.headers.authorization||"";
  if(!auth.startsWith("Bearer "))return json(res,401,{error:"Sign in as a seller to generate a product image."});
  try{
    const identity=await fetch(new URL("/auth/v1/user",supabase),{headers:{apikey:anon,Authorization:auth}});
    if(!identity.ok)return json(res,401,{error:"Your session is invalid. Sign in again."});
    const user=await identity.json();
    const roleUrl=new URL("/rest/v1/profiles",supabase);roleUrl.searchParams.set("select","role");roleUrl.searchParams.set("id","eq."+user.id);
    const roleRes=await fetch(roleUrl,{headers:{apikey:anon,Authorization:auth}});
    const roles=await roleRes.json().catch(()=>[]);
    if(!roleRes.ok||!["seller","distributor","retailer"].includes(roles?.[0]?.role))return json(res,403,{error:"Only approved seller, distributor or retailer profiles can generate listing images."});
    const quota=await fetch(new URL("/rest/v1/rpc/consume_product_image_quota",supabase),{method:"POST",headers:{apikey:anon,Authorization:auth,"Content-Type":"application/json"},body:"{}"});
    const allowed=await quota.json().catch(()=>false);
    if(!quota.ok)return json(res,503,{error:"AI image quota service is unavailable. Apply the AI image migration first."});
    if(allowed!==true)return json(res,429,{error:"Daily AI image limit reached. You can generate up to five product images per 24 hours."});
    const body=req.body||{},name=typeof body.name==="string"?body.name.trim():"",category=typeof body.category==="string"?body.category.trim():"",description=typeof body.description==="string"?body.description.trim():"";
    if(name.length<3||name.length>160||category.length>80||description.length>1200)return json(res,400,{error:"Provide a valid product name, category and concise description."});
    const prompt="Create one photorealistic, premium studio catalogue photograph of this exact product concept: "+name+". Category: "+category+". Seller description: "+description+". Show one clear item on a clean neutral dark graphite studio background, tasteful cyan and violet neon rim lighting and realistic materials. Product-only composition, centered, accurate to the written description. No text, labels, logos, watermarks, fake certifications, people, packaging claims or invented brand marks. This is an illustrative AI-generated listing image, not proof of the actual item's condition or provenance.";
    const generated=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:"Bearer "+openai,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-image-1",prompt,size:"1024x1024",quality:"medium",output_format:"png"}),signal:AbortSignal.timeout(90000)});
    const imageData=await generated.json().catch(()=>({}));
    if(!generated.ok||!imageData.data?.[0]?.b64_json)return json(res,502,{error:"The AI image provider could not generate this image. Please try again later."});
    const bytes=Buffer.from(imageData.data[0].b64_json,"base64");
    if(bytes.length>12*1024*1024)return json(res,413,{error:"Generated image exceeded the allowed upload size."});
    const path=user.id+"/"+crypto.randomUUID()+".png";
    const upload=await fetch(new URL("/storage/v1/object/product-images/"+path,supabase),{method:"POST",headers:{apikey:anon,Authorization:auth,"Content-Type":"image/png","x-upsert":"false"},body:bytes});
    if(!upload.ok)return json(res,502,{error:"Image generated but could not be saved. Apply the product-images storage migration and retry."});
    const imageUrl=new URL("/storage/v1/object/public/product-images/"+path,supabase).toString();
    return json(res,200,{image_url:imageUrl,generated:true,notice:"AI-generated illustration. Seller must confirm it accurately depicts the real product."});
  }catch(error){return json(res,502,{error:"AI image service is temporarily unavailable."})}
}
