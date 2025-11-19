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
  
  const amNode=await UserService.hasPermission(userId,'notifications.aggregate_manager').catch(()=>false)
  const dmNode=await UserService.hasPermission(userId,'notifications.district_manager').catch(()=>false)
  const gmNode=await UserService.hasPermission(userId,'notifications.general_manager').catch(()=>false)
  
  if(!amNode && !dmNode && !gmNode) return []
  
  const prevMonday=getPreviousWeekMonday()
  const weekIso=prevMonday.toISOString().slice(0,10)
  const weekRangeStr=formatRange(prevMonday)
  
  const notifications=[]
  
  try {
    const {data,error} = await supabase
      .from('reports')
      .select('*')
      .eq('week',weekIso)
      .eq('report_name','aggregate_production')
    
    if (error) return []
    
    const submittedUserIds = new Set(
      (data || [])
        .filter(r => r.completed === true && r.submitted_at != null)
        .map(r => r.user_id || r.userId)
        .filter(Boolean)
    )
    
    if (amNode && !submittedUserIds.has(userId)) {
      notifications.push({
        id:`reports-overdue-agg-${userId}`,
        title:'Aggregate Production Report Overdue',
        subtitle:`Week ${weekRangeStr}`,
        severity:'error',
        type:'reports.overdue.aggregate_production'
      })
    }
    
    if (dmNode || gmNode) {
      const {data: users} = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .contains('permission_nodes', ['reports.assigned.aggregate_production'])
      
      if (users && users.length > 0) {
        for (const user of users) {
          if (!submittedUserIds.has(user.id)) {
            notifications.push({
              id:`reports-overdue-agg-user-${user.id}`,
              title:`${user.first_name} ${user.last_name}'s Aggregate Report Overdue`,
              subtitle:`Week ${weekRangeStr}`,
              severity:'error',
              type:'reports.overdue.aggregate_production'
            })
          }
        }
      }
    }
  } catch {}
  
  return notifications
}

export default {id:'reports.overdue.aggregate_production', getNotifications}
