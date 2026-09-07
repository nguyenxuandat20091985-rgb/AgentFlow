"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function PwaRegister(){
 const [deferred,setDeferred]=useState<InstallEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const [ios,setIos]=useState(false);
 const [show,setShow]=useState(true);
 useEffect(()=>{
   if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
   const standalone=window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & {standalone?:boolean}).standalone === true;
   setInstalled(standalone);
   setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
   const onPrompt=(e:Event)=>{e.preventDefault();setDeferred(e as InstallEvent);setShow(true)};
   const onInstalled=()=>{setInstalled(true);setDeferred(null);setShow(false)};
   window.addEventListener("beforeinstallprompt",onPrompt);
   window.addEventListener("appinstalled",onInstalled);
   return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled)};
 },[]);
 async function install(){
   if(deferred){await deferred.prompt();await deferred.userChoice;setDeferred(null);return}
   if(ios) alert("Trên iPhone/iPad: mở bằng Safari → nhấn nút Chia sẻ → chọn Thêm vào Màn hình chính (Add to Home Screen).\n\nSau đó AgentFlow sẽ có biểu tượng như một ứng dụng trên màn hình.");
   else alert("Nếu nút cài đặt của trình duyệt chưa xuất hiện, hãy mở menu trình duyệt (⋮) và chọn Install app / Add to Home screen.");
 }
 if(installed||!show) return null;
 return <div className="install-banner" role="dialog" aria-label="Cài đặt AgentFlow"><img src="/avatar.svg" alt="AgentFlow"/><div className="install-copy"><strong>Tải AgentFlow về điện thoại</strong><span>{ios?"Thêm AgentFlow vào Màn hình chính để mở nhanh như app.":"Cài AgentFlow để mở nhanh như ứng dụng và dùng toàn màn hình."}</span></div><button onClick={install}>Tải app</button><button className="install-close" aria-label="Đóng" onClick={()=>setShow(false)}>×</button></div>;
}
