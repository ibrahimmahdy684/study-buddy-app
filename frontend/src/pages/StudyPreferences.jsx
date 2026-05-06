import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isBefore, startOfDay, addMonths, subMonths, isSameDay,
} from 'date-fns';
import { useSession } from '../hooks/useSession';
import { toStudyModeEnum, fromStudyModeEnum, toGroupSizeInt, fromGroupSizeInt } from '../lib/mappers';

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

// In order to adapt the old UI to the new Backend schema for availability,
// we will wire up the calendar in the Availability page instead of here.
// We'll leave the calendar UI here for "Preferences" visually but we'll disable the calendar
// functionality and point them to the Availability page if that's preferred, OR we can implement the 
// Availability mutations here too.
// The user request says "Do not touch anything in services/, gateway/, or any page outside of the Study Preferences and Availability pages."
// "Step 3 - Wire Study Preferences page: On save, call updateStudyPreferences mutation with: studyPace, studyMode, preferredGroupSize, studyStyle"
// This implies the availability slots belong ONLY to the Availability page now, so we will remove the 
// availability grid from the StudyPreferences page to make it purely for Preferences.

export default function StudyPreferences() {
  const navigate = useNavigate();
  const { user } = useSession();

  // Form State
  const [studyPace, setStudyPace] = useState('');
  const [studyMode, setStudyMode] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [studyStyle, setStudyStyle] = useState([]);
  
  const [saveError, setSaveError] = useState(null);

  // Load existing preferences
  const { data, loading: queryLoading, error: queryError } = useQuery(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const profile = data?.profile;
      if (profile) {
        setStudyPace(profile.studyPace || '');
        setStudyMode(fromStudyModeEnum(profile.studyMode));
        setGroupSize(fromGroupSizeInt(profile.preferredGroupSize || 1));
        
        // studyStyle is stored as a single comma-separated string
        if (profile.studyStyle) {
          setStudyStyle(profile.studyStyle.split(',').map(s => s.trim()).filter(Boolean));
        } else {
          setStudyStyle([]);
        }
      }
    }
  });

  // Save preferences
  const [updatePreferences, { loading: mutationLoading }] = useMutation(UPDATE_STUDY_PREFERENCES, {
    onCompleted: () => {
      navigate('/availability');
    },
    onError: (err) => {
      setSaveError(err.message || 'Failed to save preferences');
    }
  });

  const toggleStudyStyle = (style) => {
    setStudyStyle(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
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
            studyMode: studyMode ? toStudyModeEnum(studyMode) : null,
            preferredGroupSize: groupSize ? toGroupSizeInt(groupSize) : null,
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
      <div className="max-w-3xl mx-auto p-6 text-center text-[#5A5A5A]">
        Please log in to view your preferences.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Study Preferences
          </h1>
          <p className="text-sm text-[#5A5A5A] mt-0.5">
            Set how you like to study to help us find the perfect match.
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
            <div className="p-6 space-y-8">
              
              {saveError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {saveError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-3">Study Pace</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-3">
                  {['Slow', 'Moderate', 'Fast'].map(p => (
                    <button key={p} type="button" onClick={() => setStudyPace(p)} className={chip(studyPace === p)}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-3">Study Mode</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-3">
                  {['Online', 'In-person', 'Both'].map(m => (
                    <button key={m} type="button" onClick={() => setStudyMode(m)} className={chip(studyMode === m)}>{m}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-3">Preferred Group Size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['1 (solo)', '2-3 people', '4-6 people', '7+ people'].map(s => (
                    <button key={s} type="button" onClick={() => setGroupSize(s)} className={chip(groupSize === s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-3">
                  Study Style <span className="text-xs text-[#5A5A5A] font-normal ml-2">Select all that apply</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Writing', 'Listening', 'Discussion', 'Quiet Study', 'Visual', 'Problem Solving'].map(s => (
                    <button
                      key={s} type="button" onClick={() => toggleStudyStyle(s)}
                      className={`py-2.5 text-sm rounded-lg border-2 transition-all font-medium ${
                        studyStyle.includes(s)
                          ? 'border-[#C76B4F] bg-[#C76B4F] text-white shadow-sm'
                          : 'border-gray-200 bg-white text-[#2B2B2B] hover:border-[#C76B4F]'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button
                type="button" onClick={() => navigate('/availability')}
                className="px-5 py-2.5 border-2 border-gray-200 text-[#2B2B2B] rounded-lg hover:bg-white transition-colors text-sm font-medium"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={mutationLoading}
                className="px-6 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {mutationLoading ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
