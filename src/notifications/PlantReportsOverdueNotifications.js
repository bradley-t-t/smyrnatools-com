import {UserService} from '../services/UserService'
import {RegionService} from '../services/RegionService'
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

async function fetchReportsForWeek(weekMondayIso, reportNames) {
  const results={}
  for(const name of reportNames) results[name]=[]
  try {
    const {data,error} = await supabase.from('reports').select('*').eq('week',weekMondayIso)
    if (error || !Array.isArray(data)) return results
    data.forEach(r=>{
      const isSubmitted = r.completed===true && r.submitted_at != null
      if(!isSubmitted) return
      const reportType=r.type||r.report_name||''
      if (reportNames.includes(reportType)) results[reportType].push(r)
    })
  } catch {}
  return results
}

async function getNotifications({userId, selectedRegion}) {
  if (!userId) return []
  const pmNode=await UserService.hasPermission(userId,'notifications.plant_manager').catch(()=>false)
  const dmNode=await UserService.hasPermission(userId,'notifications.district_manager').catch(()=>false)
  const gmNode=await UserService.hasPermission(userId,'notifications.general_manager').catch(()=>false)
  if(!pmNode && !dmNode && !gmNode) return []
  
  const prevMonday=getPreviousWeekMonday()
  const weekIso=prevMonday.toISOString().slice(0,10)
  const weekRangeStr=formatRange(prevMonday)
  const reportNames=['plant_manager','plant_production']
  const reportsByType=await fetchReportsForWeek(weekIso, reportNames)
  
  if (pmNode) {
    const userPlant=await UserService.getUserPlant(userId).catch(()=>null)
    const userPlantCodeRaw=typeof userPlant==='string'?userPlant:(userPlant?.plant_code||userPlant?.plantCode||'')
    const userPlantCode=userPlantCodeRaw?String(userPlantCodeRaw).toUpperCase():''
    
    console.log('OVERDUE DEBUG: PM checking plant',userPlantCode)
    
    if(!userPlantCode) {
      console.log('OVERDUE DEBUG: No plant assigned')
      return []
    }
    
    console.log('OVERDUE DEBUG: Checking',reportsByType.plant_manager.length,'PM reports')
    const hasPM=reportsByType.plant_manager.some(r=>{
      const reportUserId=r?.user_id||r?.userId||''
      const match=reportUserId===userId
      console.log('OVERDUE DEBUG: PM report user_id',reportUserId,'vs',userId,'match=',match)
      return match
    })
    
    console.log('OVERDUE DEBUG: Checking',reportsByType.plant_production.length,'Prod reports')
    const hasProd=reportsByType.plant_production.some(r=>{
      const plantVal=r?.plant_code||r?.data?.plant_code||r?.data?.plant||''
      const match=String(plantVal).toUpperCase()===userPlantCode
      console.log('OVERDUE DEBUG: Prod report plant',String(plantVal).toUpperCase(),'vs',userPlantCode,'match=',match)
      return match
    })
    
    console.log('OVERDUE DEBUG: Results - hasPM:',hasPM,'hasProd:',hasProd)
    
    if(!hasPM || !hasProd) {
      return [{
        id:`reports-overdue-pm-${userPlantCode}`,
        title:'Your Reports are Overdue',
        subtitle:`Week ${weekRangeStr}`,
        severity:'error',
        type:'reports.overdue',
        plantCode:userPlantCode
      }]
    }
    return []
  }
  
  const notifications=[]
  
  if (dmNode || gmNode) {
    const regionCode=selectedRegion?.code||''
    const allowedPlants=regionCode?await RegionService.getAllowedPlantCodes(regionCode).catch(()=>new Set()):new Set()
    const scopedPlants=allowedPlants instanceof Set?allowedPlants:new Set(Array.isArray(allowedPlants)?allowedPlants:[])
    
    const submittedPMPlantsSet=new Set()
    for(const pmReport of reportsByType.plant_manager){
      const uid=pmReport?.user_id||pmReport?.userId||''
      if(!uid) continue
      const userPlantRaw=await UserService.getUserPlant(uid).catch(()=>null)
      const userPlantCode=typeof userPlantRaw==='string'?userPlantRaw:(userPlantRaw?.plant_code||userPlantRaw?.plantCode||'')
      if(userPlantCode){
        submittedPMPlantsSet.add(String(userPlantCode).toUpperCase())
      }
    }
    
    const submittedProdPlantsSet=new Set()
    for(const prodReport of reportsByType.plant_production){
      const plantVal=prodReport?.plant_code||prodReport?.data?.plant_code||prodReport?.data?.plant||''
      if(plantVal){
        submittedProdPlantsSet.add(String(plantVal).toUpperCase())
      }
    }
    
    scopedPlants.forEach(code=>{
      const up=String(code).toUpperCase()
      const hasPM=submittedPMPlantsSet.has(up)
      const hasProd=submittedProdPlantsSet.has(up)
      
      if(!hasPM || !hasProd) {
        notifications.push({
          id:`reports-overdue-${up}`,
          title:`Plant ${up}'s Manager Reports Overdue`,
          subtitle:`Week ${weekRangeStr}`,
          severity:'error',
          type:'reports.overdue',
          plantCode:up
        })
      }
    })
  }
  
  return notifications
}

export default {id:'reports.overdue', getNotifications}
