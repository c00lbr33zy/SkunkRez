import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Phone, Mail, User, Hash } from 'lucide-react';
import { BookingModal } from './BookingModal';

interface Venue {
  id: string;
  name: string;
  address: string;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
}

interface Table {
  id: string;
  venue_id: string;
  table_number: string;
  capacity: number;
}

interface Reservation {
  id: string;
  table_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  guest_count?: number;
  member_number?: string;
  notes?: string;
}

function ReservationTooltip({ reservation }: { reservation: Reservation }) {
  return (
    <div className="absolute left-0 top-full mt-2 z-[9999] pointer-events-none">
      <div className="bg-slate-900 text-white rounded-lg shadow-2xl p-4 w-[300px] border-2 border-slate-600">
        <div className="space-y-3">
          <div className="border-b border-slate-700 pb-2">
            <h4 className="font-semibold text-base text-white">Reservation Details</h4>
          </div>

          {reservation.customer_name && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Guest Name</div>
                <div className="text-sm font-medium">{reservation.customer_name}</div>
              </div>
            </div>
          )}

          {reservation.customer_email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Email</div>
                <div className="text-sm font-medium break-all">{reservation.customer_email}</div>
              </div>
            </div>
          )}

          {reservation.customer_phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Phone</div>
                <div className="text-sm font-medium">{reservation.customer_phone}</div>
              </div>
            </div>
          )}

          {reservation.guest_count && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Party Size</div>
                <div className="text-sm font-medium">{reservation.guest_count} {reservation.guest_count === 1 ? 'Guest' : 'Guests'}</div>
              </div>
            </div>
          )}

          {reservation.member_number && (
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Member #</div>
                <div className="text-sm font-medium">{reservation.member_number}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Time</div>
              <div className="text-sm font-medium">{reservation.start_time.substring(0, 5)} - {reservation.end_time.substring(0, 5)}</div>
            </div>
          </div>

          {reservation.notes && (
            <div className="flex items-start gap-2 pt-2 border-t border-slate-700">
              <div>
                <div className="text-xs text-slate-400 mb-1">Special Requests</div>
                <div className="text-sm">{reservation.notes}</div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-full left-6 mb-[-2px]">
          <div className="w-4 h-4 bg-slate-900 border-l-2 border-t-2 border-slate-600 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
}

function TimeSlot({
  time,
  isBooked,
  reservation,
  onSelect,
  isBeingBooked,
}: {
  table: Table;
  date: string;
  time: string;
  isBooked: boolean;
  reservation?: Reservation;
  onSelect: () => void;
  isBeingBooked?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => {
    if (isBooked && reservation) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className="relative">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        <button
          onClick={onSelect}
          disabled={isBooked || isBeingBooked}
          className={`relative p-3 rounded-lg text-sm font-medium transition-all w-full ${
            isBooked
              ? 'bg-slate-200 text-slate-500 cursor-default hover:bg-slate-300'
              : isBeingBooked
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-400 cursor-not-allowed shadow-lg'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{time}</span>
          </div>
          {isBeingBooked && (
            <div className="text-xs mt-1 font-normal">
              Booking...
            </div>
          )}
        </button>
      </div>
      {showTooltip && reservation && (
        <ReservationTooltip reservation={reservation} />
      )}
    </div>
  );
}

export function ReservationCalendar() {
  const { user, signOut } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    table: Table;
    time: string;
  } | null>(null);
  const [capacityFilter, setCapacityFilter] = useState<'all' | '2' | '4' | '6+'>('all');

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadTables(selectedVenue.id);
    }
  }, [selectedVenue]);

  useEffect(() => {
    if (selectedVenue) {
      loadReservations(selectedVenue.id, selectedDate);
    }
  }, [selectedVenue, selectedDate]);

  const loadVenues = async () => {
    const { data } = await supabase.from('venues').select('*');
    if (data) {
      setVenues(data);
      if (data.length > 0) {
        setSelectedVenue(data[0]);
      }
    }
  };

  const loadTables = async (venueId: string) => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('table_number');
    if (data) setTables(data);
  };

  const loadReservations = async (venueId: string, date: string) => {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('venue_id', venueId)
      .eq('reservation_date', date)
      .in('status', ['confirmed', 'pending']);
    if (data) setReservations(data);
  };

  const generateTimeSlots = () => {
    if (!selectedVenue) return [];
    const slots: string[] = [];
    const start = selectedVenue.opening_time.split(':').map(Number);
    const end = selectedVenue.closing_time.split(':').map(Number);
    const duration = selectedVenue.slot_duration_minutes;

    let currentMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      currentMinutes += duration;
    }

    return slots;
  };

  const isSlotBooked = (tableId: string, time: string) => {
    return reservations.some(
      (r) => r.table_id === tableId && r.start_time.substring(0, 5) === time
    );
  };

  const getReservationForSlot = (tableId: string, time: string): Reservation | undefined => {
    return reservations.find(
      (r) => r.table_id === tableId && r.start_time.substring(0, 5) === time
    );
  };

  const timeSlots = generateTimeSlots();

  const filterTablesByCapacity = (tables: Table[]) => {
    if (capacityFilter === 'all') return tables;
    if (capacityFilter === '2') return tables.filter(t => t.capacity === 2);
    if (capacityFilter === '4') return tables.filter(t => t.capacity === 4);
    if (capacityFilter === '6+') return tables.filter(t => t.capacity >= 6);
    return tables;
  };

  const filteredTables = filterTablesByCapacity(tables);

  const handleBookingComplete = () => {
    setSelectedSlot(null);
    if (selectedVenue) {
      loadReservations(selectedVenue.id, selectedDate);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-slate-900" />
              </div>
              <h1 className="text-3xl font-bold text-white">SkunkRez</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium">
                <span className="text-white">Logged In: </span>
                <span className="text-green-400">{user?.email}</span>
              </p>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-white hover:text-slate-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Venue
              </label>
              <select
                value={selectedVenue?.id || ''}
                onChange={(e) => {
                  const venue = venues.find((v) => v.id === e.target.value);
                  setSelectedVenue(venue || null);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              {selectedVenue && (
                <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{selectedVenue.address}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {selectedVenue && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="mb-6 -mx-6 -mt-6 px-6 py-5 bg-slate-900 rounded-t-2xl">
              <h2 className="text-3xl font-extrabold text-white">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
            </div>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-slate-900">Available Time Slots</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Filter by capacity:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCapacityFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        capacityFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setCapacityFilter('2')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        capacityFilter === '2'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      2 Guests
                    </button>
                    <button
                      onClick={() => setCapacityFilter('4')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        capacityFilter === '4'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      4 Guests
                    </button>
                    <button
                      onClick={() => setCapacityFilter('6+')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        capacityFilter === '6+'
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      6+ Guests
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-100 border-2 border-emerald-200 rounded"></div>
                  <span className="text-slate-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                  <span className="text-slate-600">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 rounded"></div>
                  <span className="text-slate-600">Booked</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible">
              <div className="min-w-max">
                <div className="grid gap-4 py-20">
                  {filteredTables.map((table) => (
                    <div key={table.id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Table {table.table_number}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Capacity: {table.capacity} guests
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {timeSlots.map((time) => (
                          <TimeSlot
                            key={time}
                            table={table}
                            date={selectedDate}
                            time={time}
                            isBooked={isSlotBooked(table.id, time)}
                            reservation={getReservationForSlot(table.id, time)}
                            onSelect={() => setSelectedSlot({ table, time })}
                            isBeingBooked={selectedSlot?.table.id === table.id && selectedSlot?.time === time}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSlot && selectedVenue && (
        <BookingModal
          venue={selectedVenue}
          table={selectedSlot.table}
          date={selectedDate}
          time={selectedSlot.time}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingComplete}
        />
      )}
    </div>
  );
}
