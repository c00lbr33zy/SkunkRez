import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Calendar, Clock, Users, MapPin } from 'lucide-react';

interface BookingModalProps {
  venue: {
    id: string;
    name: string;
    address: string;
    slot_duration_minutes: number;
  };
  table: {
    id: string;
    table_number: string;
    capacity: number;
  };
  date: string;
  time: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ venue, table, date, time, onClose, onSuccess }: BookingModalProps) {
  const { user } = useAuth();
  const [guestCount, setGuestCount] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberFound, setMemberFound] = useState<boolean | null>(null);
  const [memberSearched, setMemberSearched] = useState(false);

  const calculateEndTime = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + venue.slot_duration_minutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleMemberNumberChange = async (value: string) => {
    setMemberNumber(value);
    setMemberSearched(false);
    setMemberFound(null);

    if (value.trim()) {
      try {
        const { data: member } = await supabase
          .from('members')
          .select('name, email, phone')
          .eq('member_number', value.trim())
          .maybeSingle();

        setMemberSearched(true);

        if (member) {
          setName(member.name);
          setEmail(member.email);
          setPhone(member.phone);
          setMemberFound(true);
          setError('');
        } else {
          setMemberFound(false);
        }
      } catch (err) {
        console.error('Error fetching member data:', err);
        setMemberSearched(true);
        setMemberFound(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endTime = calculateEndTime();

      const { data: existingReservation } = await supabase
        .from('reservations')
        .select('id')
        .eq('table_id', table.id)
        .eq('reservation_date', date)
        .eq('start_time', time)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle();

      if (existingReservation) {
        setError('This time slot has just been booked. Please select another slot.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('reservations')
        .insert({
          user_id: user!.id,
          venue_id: venue.id,
          table_id: table.id,
          reservation_date: date,
          start_time: time,
          end_time: endTime,
          guest_count: guestCount,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          member_number: memberNumber,
          status: 'confirmed',
          notes: notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const notificationData = {
        venueName: venue.name,
        venueAddress: venue.address,
        date: date,
        time: time,
        tableNumber: table.table_number,
        guestCount: guestCount,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
      };

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(notificationData),
        });

        await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(notificationData),
        });
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Complete Reservation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3 text-slate-700">
              <MapPin className="w-5 h-5 text-slate-500" />
              <div>
                <div className="font-semibold">{venue.name}</div>
                <div className="text-sm text-slate-600">{venue.address}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Calendar className="w-5 h-5 text-slate-500" />
              <span className="font-medium">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Clock className="w-5 h-5 text-slate-500" />
              <span className="font-medium">{time} - {calculateEndTime()}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Users className="w-5 h-5 text-slate-500" />
              <span className="font-medium">Table {table.table_number} (Capacity: {table.capacity})</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Member #
              </label>
              <input
                type="text"
                value={memberNumber}
                onChange={(e) => handleMemberNumberChange(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Enter your membership number"
                required
              />
              {memberSearched && memberFound === false && (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Member number not found. Please fill in your information manually below.
                </div>
              )}
              {memberSearched && memberFound === true && (
                <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  Member information loaded successfully.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Guests
              </label>
              <select
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                {Array.from({ length: table.capacity }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="+1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                placeholder="Any dietary restrictions or special occasions?"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Booking...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
