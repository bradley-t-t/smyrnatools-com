import {UserService} from '../services/UserService'
import {supabase} from '../services/DatabaseService'

function getPreviousWeekMonday(date=new Date()) {
  const d=new Date(date)
  d.setHours(0,0,0,0)
  const day=d.getDay()
  const mondayOffset=((day+6)%7)
  const currentMonday=new Date(d)
  currentMonday.setDate(d.getDate()-mondayOffset)
  const prevMonday=new Date(currentMonday)
  prevMonday.setDate(currentMonday.getDate()-7)
  return prevMonday
}

function formatRange(start) {
  const end=new Date(start); end.setDate(start.getDate()+5)
  const f=d=>`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`
  return `${f(start)} - ${f(end)}`
}

async function getNotifications({userId}) {
  if (!userId) return []
  
  const hasPermission=await UserService.hasPermission(userId,'notifications.general_manager').catch(()=>false)
  if(!hasPermission) return []
  
  const prevMonday=getPreviousWeekMonday()
  const weekIso=prevMonday.toISOString().slice(0,10)
  const weekRangeStr=formatRange(prevMonday)
  
  try {
    const {data,error} = await supabase
      .from('reports')
      .select('*')
      .eq('week',weekIso)
      .eq('report_name','general_manager')
      .eq('user_id',userId)
    
    if (error) return []
    
    const hasSubmittedReport = data && data.length > 0 && data.some(r => r.completed === true && r.submitted_at != null)
    
    if (!hasSubmittedReport) {
      return [{
        id:`reports-overdue-gm-${userId}`,
        title:'General Manager Report Overdue',
        subtitle:`Week ${weekRangeStr}`,
        severity:'error',
        type:'reports.overdue.general_manager'
      }]
    }
  } catch {}
  
  return []
}

export default {id:'reports.overdue.general_manager', getNotifications}
