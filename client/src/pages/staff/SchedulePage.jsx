import { useCallback, useEffect, useState } from 'react';
import { mySchedule, setBookingStatus } from '../../api/bookings.js';
import { myStaffProfile, uploadMyStaffPhoto } from '../../api/staff.js';
import Flash from '../../components/Flash.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Avatar from '../../components/Avatar.jsx';
import { formatTime, formatDateStr, todayStr, addDays } from '../../utils/date.js';
import { money } from '../../utils/format.js';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

export default function SchedulePage() {
    const [date, setDate] = useState(todayStr());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const [profile, setProfile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [ok, setOk] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await mySchedule(date);
            setAppointments(
                Array.isArray(data?.items)
                    ? data.items
                    : []
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [date]);

    // Din badle to us din ka schedule lao
    useEffect(() => {
        let active = true;

        mySchedule(date)
            .then((data) => {
                if (active) {
                    setAppointments(Array.isArray(data?.items) ? data.items : []);
                }
            })
            .catch((err) => {
                if (active) setError(err.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [date]);

    // Apni profile (photo ke liye) ek baar lao
    useEffect(() => {
        myStaffProfile()
            .then((data) => setProfile(data.staff))
            .catch((err) => setError(err.message));
    }, []);

    async function mark(a, status) {
        const label = status === 'completed' ? 'completed' : 'no-show';
        if (!window.confirm(`${a.customer_name} For the appointment ${label} Should the appointment be marked?`)) return;

        setOk('');
        setError('');
        setBusyId(a.id);
        try {
            await setBookingStatus(a.id, status);
            setOk(`Appointment ${label} mark ho gayi.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
            load();
        }
    }

    async function handlePhoto(e) {
        const file = e.target.files?.[0];
        e.target.value = ''; // dobara wohi file chunne ki ijazat
        if (!file) return;

        setOk('');
        setError('');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Only JPG, PNG or WEBP photo can be uploaded.');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setError('Photo must be smaller than 2 MB.');
            return;
        }

        setUploading(true);
        try {
            const data = await uploadMyStaffPhoto(file);
            setProfile(data.staff);
            setOk('Profile picture updated successfully.');
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    const isToday = date === todayStr();
    const active = appointments.filter((a) => a.status !== 'cancelled');
// return (
//   <div style={{ padding: '30px', color: 'black', background: 'white' }}>
//     <h1>STAFF SwwCHEDULE PAGE WORKING</h1>
//   </div>
// );  
    return (
        
        <>
            <div className="page-head">
                <h1>My Schedule</h1>
            </div>

            <Flash ok={ok} error={error} />

            {profile && (
                <div className="card row">
                    <Avatar src={profile.photo_url} name={profile.name} size={64} />
                    <div>
                        <strong>{profile.name}</strong>
                        <div className="muted">{profile.bio}</div>
                    </div>
                    <label className="btn btn-ghost btn-sm right" style={{ marginBottom: 0 }}>
                        {uploading ? 'Uploading...' : 'upload photo'}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhoto}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
            )}

            <div className="card">
                <div className="row" style={{ marginBottom: 16 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDate(addDays(date, -1))}>
                        Previous Day
                    </button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value || todayStr());
                            setLoading(true);
                            setError('');
                        }}
                        style={{ width: 170 }}
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => setDate(addDays(date, 1))}>
                       Next Day 
                    </button>
                    {!isToday && (
                        <button className="btn btn-sm" onClick={() => setDate(todayStr())}>
                            Today
                        </button>
                    )}
                    {/* {isToday && (
                        <button className="btn btn-sm" onClick={() => setDate(addDays(todayStr(), 1))}>
                            Tomorrow
                        </button>
                    )} */}
                </div>

                <h3>
                    {formatDateStr(date)} {isToday && <span className="muted">(Today)</span>}
                </h3>
                <p className="muted">{active.length} appointment(s)</p>

                {loading ? (
                    <p>Loading...</p>
                ) : appointments.length === 0 ? (
                    <p className="empty">No appointments scheduled for this day.</p>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Customer</th>
                                    <th>Service</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((a) => (
                                    <tr key={a.id} style={a.status === 'cancelled' ? { opacity: 0.55 } : undefined}>
                                        <td>
                                            {formatTime(a.start_time)} - {formatTime(a.end_time)}
                                        </td>
                                        <td>
                                            {a.customer_name}
                                            <div className="muted">{a.customer_email}</div>
                                        </td>
                                        <td>{a.service_name}</td>
                                        <td>{money(Number(a.price_cents) / 100)}</td>
                                        <td>
                                            <StatusBadge status={a.status} />
                                        </td>
                                        <td>
                                            {a.status === 'confirmed' && (
                                                <div className="row">
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => mark(a, 'completed')}
                                                        disabled={busyId === a.id}
                                                    >
                                                        Completed
                                                    </button>
                                                    <button
                                                        className="btn btn-warn btn-sm"
                                                        onClick={() => mark(a, 'no_show')}
                                                        disabled={busyId === a.id}
                                                    >
                                                        No-show
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}