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

const GET_PROFILE = gql`
  query GetProfile($userId: String!) {
    profile(userId: $userId) {
      id
      userId
      studyPace
      studyMode
      preferredGroupSize
      studyStyle
    }
  }
`;

const UPDATE_STUDY_PREFERENCES = gql`
  mutation UpdateStudyPreferences($userId: String!, $input: StudyPreferencesInput!) {
    updateStudyPreferences(userId: $userId, input: $input) {
      id
      studyPace
      studyMode
      preferredGroupSize
      studyStyle
    }
  }
`;

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

const STUDY_PACE_OPTIONS = [
  { label: 'Slow', value: 'SLOW' },
  { label: 'Moderate', value: 'MODERATE' },
  { label: 'Fast', value: 'FAST' },
];

const STUDY_MODE_OPTIONS = [
  { label: 'Online', value: 'ONLINE' },
  { label: 'In-person', value: 'IN_PERSON' },
  { label: 'Both', value: 'BOTH' },
];

const GROUP_SIZE_OPTIONS = [
  { label: '1-on-1', value: 1 },
  { label: '2-3 people', value: 2 },
  { label: '4-5 people', value: 4 },
  { label: '6+ people', value: 6 },
];

const STUDY_STYLE_OPTIONS = [
  { label: 'Writing', value: 'WRITING' },
  { label: 'Listening', value: 'LISTENING' },
  { label: 'Discussion', value: 'DISCUSSION' },
  { label: 'Quiet Study', value: 'QUIET_STUDY' },
  { label: 'Visual', value: 'VISUAL' },
  { label: 'Problem Solving', value: 'PROBLEM_SOLVING' },
];

export default function StudyPreferences() {
  const navigate = useNavigate();
  const { user } = useSession();

  const [studyPace, setStudyPace] = useState('');
  const [studyMode, setStudyMode] = useState('');
  const [groupSize, setGroupSize] = useState(null);
  const [studyStyle, setStudyStyle] = useState([]);

  const [calMonth, setCalMonth] = useState(new Date());
  const [saveError, setSaveError] = useState(null);
  const [localError, setLocalError] = useState(null);

  const { data, loading: queryLoading, error: queryError } = useQuery(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const profile = data?.profile;
      if (profile) {
        setStudyPace(profile.studyPace || '');
        setStudyMode(profile.studyMode || '');
        setGroupSize(typeof profile.preferredGroupSize === 'number' ? profile.preferredGroupSize : null);
        if (profile.studyStyle) {
          setStudyStyle(
            profile.studyStyle
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => {
                const match = STUDY_STYLE_OPTIONS.find(
                  (option) =>
                    option.value.toLowerCase() === s.toLowerCase() ||
                    option.label.toLowerCase() === s.toLowerCase()
                )
                return match?.value || s.toUpperCase().replace(/\s+/g, '_')
              })
          );
        } else {
          setStudyStyle([]);
        }
      }
    }
  });

  const { data: availabilityData, loading: availabilityLoading, error: availabilityError } = useQuery(GET_MY_AVAILABILITY, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'network-only'
  });

  const [updatePreferences, { loading: mutationLoading }] = useMutation(UPDATE_STUDY_PREFERENCES, {
    onCompleted: () => {
      navigate('/dashboard');
    },
    onError: (err) => {
      setSaveError(err.message || 'Failed to save preferences');
    }
  });

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

  const slots = availabilityData?.myAvailability || [];
  const isAnyActionLoading = addLoading || updateLoading || deleteLoading;

  const today = startOfDay(new Date());
  const calDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(calMonth), end: endOfMonth(calMonth) }),
    [calMonth]
  );
  const firstOffset = getDay(startOfMonth(calMonth));
  const isPast = (d) => isBefore(startOfDay(d), today);

  const slotsByDate = useMemo(() => {
    const grouped = {};
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  }, [slots]);

  const sortedDates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate]);

  const isSelected = (d) => {
    const key = format(d, 'yyyy-MM-dd');
    return !!slotsByDate[key] && slotsByDate[key].length > 0;
  };

  const handleDateClick = async (d) => {
    if (isPast(d) || !user?.id || isAnyActionLoading) return;
    setLocalError(null);

    const key = format(d, 'yyyy-MM-dd');
    if (slotsByDate[key] && slotsByDate[key].length > 0) return;

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
      // handled by onError
    }
  };

  const handleAddSlotToDate = async (dateKey) => {
    if (!user?.id || isAnyActionLoading) return;
    setLocalError(null);

    const daySlots = (slotsByDate[dateKey] || []).slice().sort((a, b) => a.endTime.localeCompare(b.endTime));

    let startTime = '09:00';
    let endTime = '10:00';

    if (daySlots.length > 0) {
      const lastEnd = daySlots[daySlots.length - 1].endTime;
      const [h, m] = lastEnd.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + 60;
      if (endMins > 23 * 60) {
        setLocalError('No more time available to add on this day');
        return;
      }
      startTime = `${String(Math.floor(startMins / 60)).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`;
      endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }

    try {
      await addSlot({
        variables: {
          userId: user.id,
          date: dateKey,
          startTime,
          endTime,
          isRecurring: false
        }
      });
    } catch (e) {
      // handled by onError
    }
  };

  const handleRemoveSlot = async (slotId) => {
    if (isAnyActionLoading) return;
    setLocalError(null);
    try {
      await deleteSlot({ variables: { id: slotId } });
    } catch (e) {
      // handled by onError
    }
  };

  const handleUpdateSlot = async (slot, field, value) => {
    if (isAnyActionLoading) return;
    setLocalError(null);

    const newStart = field === 'startTime' ? value : slot.startTime;
    const newEnd = field === 'endTime' ? value : slot.endTime;

    if (newStart >= newEnd) {
      setLocalError('Start time must be before end time');
      return;
    }

    const otherSlots = (slotsByDate[slot.date] || []).filter(s => s.id !== slot.id);
    const hasOverlap = otherSlots.some(s => s.startTime < newEnd && s.endTime > newStart);

    if (hasOverlap) {
      setLocalError('This time slot overlaps with another slot on the same day');
      return;
    }

    try {
      await updateSlot({
        variables: {
          id: slot.id,
          [field]: value
        }
      });
    } catch (e) {
      // handled by onError
    }
  };

  const handleRemoveDate = async (dateKey) => {
    if (isAnyActionLoading) return;
    setLocalError(null);

    const daySlots = slotsByDate[dateKey] || [];
    for (const slot of daySlots) {
      try {
        await deleteSlot({ variables: { id: slot.id } });
      } catch (e) {
        break;
      }
    }
  };

  const toggleStudyStyle = (style) => {
    setStudyStyle((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);

    if (!user?.id) return;

    try {
      await updatePreferences({
        variables: {
          userId: user.id,
          input: {
            studyPace: studyPace || null,
            studyMode: studyMode || null,
            preferredGroupSize: groupSize,
            studyStyle: studyStyle.length > 0 ? studyStyle.join(',') : null
          }
        }
      });
    } catch (error) {
      // Handled by onError
    }
  };

  const chip = (active) =>
    `flex-1 py-2 text-sm rounded-lg border-2 transition-all font-medium ${
      active ? 'border-[#C76B4F] bg-[#C76B4F] text-white' : 'border-gray-200 bg-white text-[#2B2B2B] hover:border-[#C76B4F]'
    }`;

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center text-[#5A5A5A]">
        Please log in to view your preferences.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Preferences and Availability
          </h1>
          <p className="text-sm text-[#5A5A5A] mt-0.5">
            Set how you like to study and mark exact dates and time slots when you are available.
          </p>
        </div>

        {queryLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#C76B4F]/20 border-t-[#C76B4F] rounded-full animate-spin" />
          </div>
        ) : queryError ? (
          <div className="p-6">
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              Error loading preferences: {queryError.message}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2">

              <div className="p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-gray-100">
                <p className="text-[10px] font-bold text-[#C76B4F] uppercase tracking-widest">Study Preferences</p>

              {saveError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {saveError}
                </div>
              )}

              {localError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {localError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">Study Pace</label>
                <div className="flex gap-2">
                  {STUDY_PACE_OPTIONS.map(p => (
                    <button key={p.value} type="button" onClick={() => setStudyPace(p.value)} className={chip(studyPace === p.value)}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">Study Mode</label>
                <div className="flex gap-2">
                  {STUDY_MODE_OPTIONS.map(m => (
                    <button key={m.value} type="button" onClick={() => setStudyMode(m.value)} className={chip(studyMode === m.value)}>{m.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">Preferred Group Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {GROUP_SIZE_OPTIONS.map(s => (
                    <button key={s.value} type="button" onClick={() => setGroupSize(s.value)} className={chip(groupSize === s.value)}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                  Study Style <span className="text-xs text-[#5A5A5A] font-normal">select all that apply</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STUDY_STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.value} type="button" onClick={() => toggleStudyStyle(s.value)}
                      className={`py-2 text-xs rounded-lg border-2 transition-all font-medium ${
                        studyStyle.includes(s.value)
                          ? 'border-[#C76B4F] bg-[#C76B4F] text-white'
                          : 'border-gray-200 bg-white text-[#2B2B2B] hover:border-[#C76B4F]'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              </div>

              <div className="p-6 space-y-5">
                <p className="text-[10px] font-bold text-[#C76B4F] uppercase tracking-widest">Availability - Dates and Time Slots</p>

                {availabilityError && (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                    Availability data couldn't be loaded. You can still save your study preferences.
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden select-none">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#F4E3C8]/60 border-b border-gray-100">
                    <button type="button" onClick={() => setCalMonth(p => subMonths(p, 1))} className="p-1 rounded hover:bg-[#C76B4F]/10 transition-colors">
                      <ChevronLeft className="w-4 h-4 text-[#2B2B2B]" />
                    </button>
                    <span className="text-sm font-semibold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {format(calMonth, 'MMMM yyyy')}
                    </span>
                    <button type="button" onClick={() => setCalMonth(p => addMonths(p, 1))} className="p-1 rounded hover:bg-[#C76B4F]/10 transition-colors">
                      <ChevronRight className="w-4 h-4 text-[#2B2B2B]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 border-b border-gray-100 bg-[#F4E3C8]/20">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-center text-[11px] font-semibold text-[#5A5A5A] py-1.5">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 p-2">
                    {Array.from({ length: firstOffset }).map((_, i) => <div key={`e${i}`} />)}
                    {calDays.map(date => {
                      const past = isPast(date);
                      const sel = isSelected(date);
                      const isToday = isSameDay(date, today);
                      return (
                        <button
                          key={date.toISOString()} type="button"
                          onClick={() => handleDateClick(date)} disabled={past || isAnyActionLoading}
                          className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all ${
                            past ? 'text-gray-300 cursor-default'
                            : sel ? 'bg-[#C76B4F] text-white shadow-sm'
                            : isToday ? 'ring-2 ring-[#C76B4F] text-[#C76B4F] hover:bg-[#F4E3C8]'
                            : 'text-[#2B2B2B] hover:bg-[#F4E3C8]'
                          }`}
                        >
                          {format(date, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm font-medium text-[#2B2B2B]">Selected Dates</span>
                    {sortedDates.length > 0 && (
                      <span className="text-xs text-[#5A5A5A]">
                        - {sortedDates.length} date{sortedDates.length !== 1 ? 's' : ''}, {slots.length} slot{slots.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {sortedDates.length === 0 ? (
                    <div className="text-center py-5 text-sm text-[#5A5A5A] bg-[#F4E3C8]/30 rounded-lg border border-dashed border-[#C76B4F]/20">
                      Tap any future date on the calendar to add it
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {sortedDates.map((dateKey) => {
                        const daySlots = slotsByDate[dateKey].slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
                        return (
                          <div key={dateKey} className="bg-[#F4E3C8]/40 rounded-xl border border-[#C76B4F]/10 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-[#C76B4F]/10">
                              <span className="text-xs font-semibold text-[#2B2B2B]">
                                {format(new Date(dateKey + 'T00:00:00'), 'EEEE, MMM d')}
                              </span>
                              <button
                                type="button" onClick={() => handleRemoveDate(dateKey)}
                                className="text-gray-300 hover:text-[#C76B4F] transition-colors"
                                disabled={isAnyActionLoading}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="px-3 py-2 space-y-1.5">
                              {daySlots.map((slot) => (
                                <div key={slot.id} className="flex items-center gap-1.5">
                                  <input
                                    type="time" value={slot.startTime}
                                    onChange={e => handleUpdateSlot(slot, 'startTime', e.target.value)}
                                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B4F]"
                                    disabled={isAnyActionLoading}
                                  />
                                  <span className="text-[10px] text-[#5A5A5A] shrink-0">-</span>
                                  <input
                                    type="time" value={slot.endTime}
                                    onChange={e => handleUpdateSlot(slot, 'endTime', e.target.value)}
                                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#C76B4F]"
                                    disabled={isAnyActionLoading}
                                  />
                                  <button
                                    type="button" onClick={() => handleRemoveSlot(slot.id)}
                                    className="p-0.5 text-gray-300 hover:text-[#C76B4F] transition-colors shrink-0"
                                    disabled={isAnyActionLoading}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button" onClick={() => handleAddSlotToDate(dateKey)}
                                className="flex items-center gap-1 text-[11px] text-[#C76B4F] hover:text-[#B55A3E] transition-colors font-medium mt-0.5"
                                disabled={isAnyActionLoading}
                              >
                                <Plus className="w-3 h-3" /> Add slot
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
              <button
                type="button" onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 border-2 border-gray-200 text-[#2B2B2B] rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={mutationLoading}
                className="flex-1 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {mutationLoading ? 'Saving...' : 'Save Preferences and Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
