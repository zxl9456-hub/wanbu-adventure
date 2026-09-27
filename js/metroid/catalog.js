// Original game modules: these are fictional training equipment, not product claims.
export const MODULES={
 stride:{name:'疾行鞋垫',mark:'01',source:'初始装备',description:'移动速度 +15%。适合回访旧路和长距离探索。',effect:'速度 8.6 m/s',color:'#a5ece4'},
 echo:{name:'回响线圈',mark:'02',source:'1楼电梯厅 · 隐藏展柜',description:'远程脉冲耗能从 25 降至 15。用近战回能，连续压制远处的哨机。',effect:'脉冲耗能 −40%',color:'#efc489'},
 guard:{name:'缓冲护片',mark:'03',source:'员工办公区 · 完成试炼',description:'受击后的保护时间从 1.25 秒延长至 1.65 秒。适合挑战联动守卫。',effect:'受击保护 +0.4 秒',color:'#b3baf5'}
};
export const ENEMIES={
 runner:{name:'巡游训练机',tip:'橙色闪光后沿地面冲撞。跳过它，在停顿时反击。'},
 shield:{name:'盾卫训练机',tip:'正面护盾会挡住攻击。跃到背后，或在空中按 S + J 下击破防。'},
 sentry:{name:'光束哨机',tip:'橙色瞄准线会锁定你当时的位置。看到预警再移动，靠近后反击。'}
};
