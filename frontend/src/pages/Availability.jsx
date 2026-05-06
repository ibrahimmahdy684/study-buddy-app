import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isBefore, startOfDay, addMonths, subMonths, isSameDay,
} from 'date-fns';
import { useSession } from '../hooks/useSession';

// --- GraphQL Operations ---

const GET_MY_AVAILABILITY = gql`
  query GetMyAvailability($userId: String!) {
    myAvailability(userId: $userId) {
      id
      date
      startTime
      endTime
      isRecurring
    }
  }
`;

const ADD_AVAILABILITY_SLOT = gql`
  mutation AddAvailabilitySlot($userId: String!, $date: String!, $startTime: String!, $endTime: String!, $isRecurring: Boolean) {
    addAvailabilitySlot(userId: $userId, date: $date, startTime: $startTime, endTime: $endTime, isRecurring: $isRecurring) {
      id
      date
      startTime
      endTime
      isRecurring
    }
  }
`;

const UPDATE_AVAILABILITY_SLOT = gql`
  mutation UpdateAvailabilitySlot($id: String!, $date: String, $startTime: String, $endTime: String, $isRecurring: Boolean) {
    updateAvailabilitySlot(id: $id, date: $date, startTime: $startTime, endTime: $endTime, isRecurring: $isRecurring) {
      id
      date
      startTime
      endTime
      isRecurring
    }
  }
`;

const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: String!) {
    deleteAvailabilitySlot(id: $id)
  }
`;

export default function Availability() {
  const navigate = useNavigate();
  const { user } = useSession();

  const [calMonth, setCalMonth] = useState(new Date());
  const [localError, setLocalError] = useState(null);

  // Fetch Availability
  const { data, loading: queryLoading, error: queryError } = useQuery(GET_MY_AVAILABILITY, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'network-only' // always get latest
  });

  // Mutations
  const [addSlot, { loading: addLoading }] = useMutation(ADD_AVAILABILITY_SLOT, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY, variables: { userId: user?.id } }],
    onError: (err) => setLocalError(err.message)
  });
  const [updateSlot, { loading: updateLoading }] = useMutation(UPDATE_AVAILABILITY_SLOT, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY, variables: { userId: user?.id } }],
    onError: (err) => setLocalError(err.message)
  });
  const [deleteSlot, { loading: deleteLoading }] = useMutation(DELETE_AVAILABILITY_SLOT, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY, variables: { userId: user?.id } }],
    onError: (err) => setLocalError(err.message)
  });

  const slots = data?.myAvailability || [];
  const isAnyActionLoading = addLoading || updateLoading || deleteLoading;

  // Calendar setup
  const today = startOfDay(new Date());
  const calDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) }),
    [calMonth]
  );
  const firstOffset = getDay(startOfMonth(calMonth));
  const isPast = (d) => isBefore(startOfDay(d), today);
  
  // Group slots by date string 'YYYY-MM-DD'
  const slotsByDate = useMemo(() => {
    const grouped = {};
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  }, [slots]);

  const isSelected = (d) => {
    const key = format(d, 'yyyy-MM-dd');
    return !!slotsByDate[key] && slotsByDate[key].length > 0;
  };

  const handleDateClick = async (d) => {
    if (isPast(d) || !user?.id || isAnyActionLoading) return;
    setLocalError(null);
    const key = format(d, 'yyyy-MM-dd');
    
    // If it has slots, we don't do anything on click. They manage it in the right pane.
    // If it has NO slots, we create a default 09:00 to 17:00 slot.
    if (!slotsByDate[key] || slotsByDate[key].length === 0) {
      try {
        await addSlot({
          variables: {
            userId: user.id,
            date: key,
            startTime: '09:00',
            endTime: '17:00',
            isRecurring: false
          }
        });
      } catch (e) {
        // Handled in onError
      }
    }
  };

  const handleAddSlotToDate = async (dateKey) => {
    if (!user?.id || isAnyActionLoading) return;
    setLocalError(null);
    try {
      await addSlot({
        variables: {
          userId: user.id,
          date: dateKey,
          startTime: '09:00',
          endTime: '17:00',
          isRecurring: false
        }
      });
    } catch (e) { }
  };

  const handleRemoveSlot = async (slotId) => {
    if (isAnyActionLoading) return;
    setLocalError(null);
    try {
      await deleteSlot({ variables: { id: slotId } });
    } catch (e) {}
  };

  const handleUpdateSlot = async (slot, field, value) => {
    if (isAnyActionLoading) return;
    setLocalError(null);
    
    // Optimistic frontend validation for overlap is requested, but simple overlapping check:
    const newStart = field === 'startTime' ? value : slot.startTime;
    const newEnd = field === 'endTime' ? value : slot.endTime;
    
    if (newStart >= newEnd) {
      setLocalError("Start time must be before end time");
      return;
    }

    const otherSlots = (slotsByDate[slot.date] || []).filter(s => s.id !== slot.id);
    const hasOverlap = otherSlots.some(s => 
      s.startTime < newEnd && s.endTime > newStart
    );

    if (hasOverlap) {
      setLocalError("This time slot overlaps with another slot on the same day");
      return;
    }

    try {
      await updateSlot({
        variables: {
          id: slot.id,
          [field]: value
        }
      });
    } catch (e) {}
  };

  const handleRemoveDate = async (dateKey) => {
    if (isAnyActionLoading) return;
    setLocalError(null);
    const daySlots = slotsByDate[dateKey] || [];
    for (const slot of daySlots) {
      try {
        await deleteSlot({ variables: { id: slot.id } });
      } catch (e) {
        break; // stop on first error
      }
    }
  };

  // Sort dates for the right pane
  const sortedDates = Object.keys(slotsByDate).sort();

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center text-[#5A5A5A]">
        Please log in to manage your availability.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Your Availability
            </h1>
            <p className="text-sm text-[#5A5A5A] mt-0.5">
              Mark the exact dates and time slots you are free for study sessions.
            </p>
          </div>
          {isAnyActionLoading && (
            <div className="flex items-center text-sm text-[#C76B4F]">
              <div className="w-4 h-4 border-2 border-[#C76B4F]/20 border-t-[#C76B4F] rounded-full animate-spin mr-2" />
              Saving...
            </div>
          )}
        </div>

        {queryLoading ? (
           <div className="p-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-[#C76B4F]/20 border-t-[#C76B4F] rounded-full animate-spin" />
           </div>
        ) : queryError ? (
           <div className="p-6">
             <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
               Error loading availability: {queryError.message}
             </div>
           </div>
        ) : (
          <div>
            {(localError) && (
              <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                {localError}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2">
              
              {/* LEFT — Calendar */}
              <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                <p className="text-[10px] font-bold text-[#C76B4F] uppercase tracking-widest mb-4">Select Dates</p>

                <div className="border border-gray-200 rounded-xl overflow-hidden select-none">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#F4E3C8]/40 border-b border-gray-100">
                    <button type="button" onClick={() => setCalMonth(p => subMonths(p, 1))} className="p-1.5 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200">
                      <ChevronLeft className="w-4 h-4 text-[#2B2B2B]" />
                    </button>
                    <span className="text-sm font-semibold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {format(calMonth, 'MMMM yyyy')}
                    </span>
                    <button type="button" onClick={() => setCalMonth(p => addMonths(p, 1))} className="p-1.5 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200">
                      <ChevronRight className="w-4 h-4 text-[#2B2B2B]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 border-b border-gray-100 bg-[#F4E3C8]/10">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-center text-[11px] font-semibold text-[#5A5A5A] py-2">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 p-2">
                    {Array.from({ length: firstOffset }).map((_, i) => <div key={`e${i}`} />)}
                    {calDays.map(date => {
                      const past = isPast(date);
                      const sel = isSelected(date);
                      const isToday = isSameDay(date, today);
                      return (
                        <button
                          key={date.toISOString()} type="button"
                          onClick={() => handleDateClick(date)} 
                          disabled={past || isAnyActionLoading}
                          className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            past ? 'text-gray-300 cursor-default'
                            : sel ? 'bg-[#C76B4F] text-white shadow-sm ring-1 ring-[#C76B4F] ring-offset-1'
                            : isToday ? 'ring-2 ring-[#C76B4F]/50 text-[#C76B4F] hover:bg-[#F4E3C8]/50'
                            : 'text-[#2B2B2B] hover:bg-[#F4E3C8]/50 hover:text-[#C76B4F]'
                          }`}
                        >
                          {format(date, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT — Time Slots */}
              <div className="p-6 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-[#C76B4F] uppercase tracking-widest">Time Slots</p>
                  <span className="text-xs text-[#5A5A5A] font-medium">
                    {slots.length} total slot{slots.length !== 1 && 's'}
                  </span>
                </div>

                {sortedDates.length === 0 ? (
                  <div className="text-center py-10 text-sm text-[#5A5A5A] bg-white rounded-xl border border-dashed border-[#C76B4F]/30 shadow-sm">
                    Tap any future date on the calendar<br/>to add your available times
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 pb-4">
                    {sortedDates.map((dateKey) => {
                      const daySlots = slotsByDate[dateKey].slice().sort((a,b) => a.startTime.localeCompare(b.startTime));
                      return (
                        <div key={dateKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          {/* Date header */}
                          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-[#F4E3C8]/20">
                            <span className="text-xs font-semibold text-[#2B2B2B]">
                              {format(new Date(dateKey + 'T00:00:00'), 'EEEE, MMM d')}
                            </span>
                            <button
                              type="button" onClick={() => handleRemoveDate(dateKey)}
                              disabled={isAnyActionLoading}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Clear all slots for this day"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Slots */}
                          <div className="p-3 space-y-2">
                            {daySlots.map((slot) => (
                              <div key={slot.id} className="flex items-center gap-2">
                                <input
                                  type="time" value={slot.startTime}
                                  onChange={e => handleUpdateSlot(slot, 'startTime', e.target.value)}
                                  disabled={isAnyActionLoading}
                                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C76B4F]/50 focus:border-[#C76B4F] transition-shadow disabled:opacity-50"
                                />
                                <span className="text-xs text-[#5A5A5A] shrink-0 font-medium">to</span>
                                <input
                                  type="time" value={slot.endTime}
                                  onChange={e => handleUpdateSlot(slot, 'endTime', e.target.value)}
                                  disabled={isAnyActionLoading}
                                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C76B4F]/50 focus:border-[#C76B4F] transition-shadow disabled:opacity-50"
                                />
                                <button
                                  type="button" onClick={() => handleRemoveSlot(slot.id)}
                                  disabled={isAnyActionLoading}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {/* Add slot */}
                            <button
                              type="button" onClick={() => handleAddSlotToDate(dateKey)}
                              disabled={isAnyActionLoading}
                              className="flex items-center gap-1.5 text-xs text-[#C76B4F] hover:text-[#B55A3E] transition-colors font-medium mt-1 w-full justify-center py-1.5 rounded-md hover:bg-[#F4E3C8]/30 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add another time slot
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end bg-gray-50">
              <button
                type="button" onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45A049] transition-colors text-sm font-semibold min-w-[120px]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
