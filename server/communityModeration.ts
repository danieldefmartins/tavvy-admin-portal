/** Caller must be adminProcedure; this factory receives only the server admin client. */
export function createCommunityModeration(db:any){
 return {
  async list(status='pending',offset=0,limit=50){const {data,error}=await db.rpc('admin_get_community_reports_v1',{p_status:status,p_offset:offset,p_limit:limit});if(error||!Array.isArray(data?.reports)||!Number.isInteger(data?.total))throw new Error('Community reports could not be loaded. Please retry.');return data as {reports:any[];total:number};},
  async moderate(id:string,action:'hide'|'dismiss'|'restore',actor:string,notes?:string){const {data,error}=await db.rpc('admin_moderate_community_report_v1',{p_report_id:id,p_action:action,p_actor:actor,p_notes:notes||null});if(error||data?.updated!==true||data.reportId!==id)throw new Error('The server did not confirm moderation. Refresh before trying again.');return{success:true};}
 };
}
