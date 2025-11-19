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

async function getNotifications({userId, selectedRegion}) {
  if (!userId) return []
  
  const smNode=await UserService.hasPermission(userId,'notifications.safety_manager').catch(()=>false)
  const dmNode=await UserService.hasPermission(userId,'notifications.district_manager').catch(()=>false)
  const gmNode=await UserService.hasPermission(userId,'notifications.general_manager').catch(()=>false)
  
  if(!smNode && !dmNode && !gmNode) return []
  
  const prevMonday=getPreviousWeekMonday()
  const weekIso=prevMonday.toISOString().slice(0,10)
  const weekRangeStr=formatRange(prevMonday)
  
  const notifications=[]
  
  try {
    const {data,error} = await supabase
      .from('reports')
      .select('*')
      .eq('week',weekIso)
      .eq('report_name','safety_manager')
    
    if (error) return []
    
    const submittedUserIds = new Set(
      (data || [])
        .filter(r => r.completed === true && r.submitted_at != null)
        .map(r => r.user_id || r.userId)
        .filter(Boolean)
    )
    
    if (smNode && !submittedUserIds.has(userId)) {
      notifications.push({
        id:`reports-overdue-safety-${userId}`,
        title:'Safety Manager Report Overdue',
        subtitle:`Week ${weekRangeStr}`,
        severity:'error',
        type:'reports.overdue.safety_manager'
      })
    }
    
    if (dmNode || gmNode) {
      const {data: users} = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .contains('permission_nodes', ['reports.assigned.safety_manager'])
      
      if (users && users.length > 0) {
        for (const user of users) {
          if (!submittedUserIds.has(user.id)) {
            notifications.push({
              id:`reports-overdue-safety-user-${user.id}`,
              title:`${user.first_name} ${user.last_name}'s Safety Report Overdue`,
              subtitle:`Week ${weekRangeStr}`,
              severity:'error',
              type:'reports.overdue.safety_manager'
            })
          }
        }
      }
    }
  } catch {}
  
  return notifications
}

export default {id:'reports.overdue.safety_manager', getNotifications}
