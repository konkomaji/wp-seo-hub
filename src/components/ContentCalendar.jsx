import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCalendarSettings, saveCalendarSettings, getLocalPosts } from '../store/store';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { C } from '../theme';

const DAYS     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ContentCalendar({ clients, onCompose }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || null);
  const [weekStart, setWeekStart]           = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [scheduleMap, setScheduleMap]       = useState({});
  const [localPostsMap, setLocalPostsMap]   = useState({});

  useEffect(() => {
    if (clients.length && !selectedClient) setSelectedClient(clients[0].id);
  }, [clients]);

  useEffect(() => {
    Promise.all([
      getCalendarSettings().catch(() => ({})),
      getLocalPosts().catch(() => ({})),
    ]).then(([settings, posts]) => {
      const built = {};
      clients.forEach(c => { built[c.id] = settings[c.id] || defaultSchedule(c.weeklyFrequency); });
      setScheduleMap(built);
      setLocalPostsMap(posts);
    });
  }, [clients]);

  const client      = clients.find(c => c.id === selectedClient);
  const schedule    = scheduleMap[selectedClient] || [];
  const clientPosts = localPostsMap[selectedClient] || [];

  const toggleDay = async (dayIdx) => {
    const isOn = schedule.includes(dayIdx);
    let next;
    if (isOn) {
      next = schedule.filter(d => d !== dayIdx);
    } else {
      const freq = client?.weeklyFrequency || 3;
      if (schedule.length >= freq) next = [...schedule.slice(1), dayIdx].sort((a, b) => a - b);
      else next = [...schedule, dayIdx].sort((a, b) => a - b);
    }
    const updated = { ...scheduleMap, [selectedClient]: next };
    setScheduleMap(updated);
    await saveCalendarSettings(selectedClient, next).catch(() => {});
  };

  const getPostsForDay = (dayDate) =>
    clientPosts.filter(p => p.scheduledDate && isSameDay(new Date(p.scheduledDate), dayDate));
  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Content Calendar</h2>
          <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>Plan your weekly publishing schedule</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState msg="Add a client first to set up their calendar." />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => setSelectedClient(c.id)}
                style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: selectedClient === c.id ? C.accent : C.bg3,
                  color:      selectedClient === c.id ? C.bg1   : C.t3,
                  border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
                {c.name} <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>{c.weeklyFrequency}×</span>
              </button>
            ))}
          </div>

          {client && (
            <>
              <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={16} color={C.accent} />
                <span style={{ fontSize: 13, color: C.t2 }}>
                  <strong style={{ color: C.t1 }}>{client.name}</strong> — publishing{' '}
                  <strong style={{ color: C.accent }}>{client.weeklyFrequency} posts/week</strong>. Select which days below.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 28 }}>
                {DAYS.map((day, i) => {
                  const isSelected = schedule.includes(i);
                  const dayDate    = weekDays[i];
                  const posts      = getPostsForDay(dayDate);
                  return (
                    <div key={i} onClick={() => toggleDay(i)}
                      style={{ background: isSelected ? C.accentBg : C.bg3, border: `1px solid ${isSelected ? C.accentBd : C.b2}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 11, color: isSelected ? C.accent : C.t3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day}</div>
                      <div style={{ fontSize: 13, color: isSelected ? C.t1 : C.t4, fontWeight: 500 }}>{format(dayDate, 'd')}</div>
                      {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, margin: '6px auto 0' }} />}
                      {posts.length > 0 && <div style={{ marginTop: 5, fontSize: 10, color: C.green }}>{posts.length} post{posts.length > 1 ? 's' : ''}</div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} style={iconBtn}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 14, color: C.t2 }}>{format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
                <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} style={iconBtn}><ChevronRight size={16} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schedule.length === 0 && <EmptyState msg="Select publishing days above." />}
                {schedule.map(dayIdx => {
                  const dayDate = weekDays[dayIdx];
                  const posts   = getPostsForDay(dayDate);
                  return (
                    <div key={dayIdx} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{DAY_FULL[dayIdx]}</span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: C.t3 }}>{format(dayDate, 'MMM d')}</span>
                        </div>
                        <button onClick={() => onCompose(client, dayDate)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg4, border: `1px solid ${C.b3}`, borderRadius: 6, padding: '6px 12px', color: C.accent, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Plus size={13} /> Write Post
                        </button>
                      </div>
                      {posts.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {posts.map(p => (
                            <div key={p.localId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.bg2, borderRadius: 7, border: `1px solid ${C.b1}` }}>
                              {p.wpPostId ? <CheckCircle2 size={14} color={C.green} /> : <FileText size={14} color={C.t3} />}
                              <span style={{ fontSize: 13, color: C.t2, flex: 1 }}>{p.title || 'Untitled'}</span>
                              <span style={{ fontSize: 11, color: p.wpPostId ? C.green : C.t3 }}>{p.wpPostId ? 'Pushed to WP' : 'Draft'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function defaultSchedule(freq) {
  const d = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  return d[freq] || [0, 2, 4];
}

function EmptyState({ msg }) {
  return <div style={{ textAlign: 'center', padding: '40px 20px', color: C.t3, fontSize: 13 }}>{msg}</div>;
}

const iconBtn = { background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '6px 10px', color: C.t3, cursor: 'pointer', display: 'flex', alignItems: 'center' };
