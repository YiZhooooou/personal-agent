import React from 'react';

// Keep renderer exceptions visible locally instead of unmounting to a blank window.
// No conversation data or diagnostic information is sent to a service.
export class RenderBoundary extends React.Component<React.PropsWithChildren,{error:string|null}> {
 state:{error:string|null}={error:null};
 static getDerivedStateFromError(error:unknown){
  return {error:(error instanceof Error?error.stack||`${error.name}: ${error.message}`:String(error)).slice(0,6000)};
 }
 render(){
  if(this.state.error!==null)return <section className="render-failure" role="alert">
   <h1>界面发生错误 / Interface error</h1>
   <p>聊天记录没有被删除。请将下方错误信息发给开发者，再尝试重新加载。</p>
   <p>Your saved chats have not been deleted. Report the error below, then try reloading.</p>
   <pre>{this.state.error}</pre>
   <button onClick={()=>window.location.reload()}>重新加载 / Reload</button>
  </section>;
  return this.props.children;
 }
}
