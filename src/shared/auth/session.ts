import {cookies} from "next/headers";import{jwtVerify,SignJWT}from"jose";
const name="delevry_session";
function secret(){const s=process.env.AUTH_SECRET;if(!s||s.length<32)throw new Error("AUTH_SECRET must contain at least 32 characters");return new TextEncoder().encode(s)}
export async function createSession(userId:string,role:string){return new SignJWT({sub:userId,role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("12h").sign(secret())}
export async function getSession(){const token=(await cookies()).get(name)?.value;if(!token)return null;try{const{payload}=await jwtVerify(token,secret());return{userId:String(payload.sub),role:String(payload.role)}}catch{return null}}
export async function setSession(token:string){(await cookies()).set(name,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:43200})}