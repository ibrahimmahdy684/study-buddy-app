import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { BookOpen, Search, Star, Users } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { useUserNames } from '../hooks/useUserNames'
import { GET_RECOMMENDED_BUDDIES } from '../lib/graphql/queries'
import { GET_OR_CREATE_CONVERSATION } from '../lib/graphql/mutations'
import { Card, Spinner } from '../components'

const MatchingPage = () => {
	const navigate = useNavigate()
	const { user, loading: userLoading } = useSession()
	const [searchTerm, setSearchTerm] = useState('')
	const [actionError, setActionError] = useState('')

	const { data, loading: matchesLoading } = useQuery(
		GET_RECOMMENDED_BUDDIES,
		{
			variables: { userId: user?.id, limit: 24, minScore: 50 },
			skip: !user?.id,
			errorPolicy: 'all',
		}
	)

	const [getOrCreateConversation] = useMutation(
		GET_OR_CREATE_CONVERSATION
	)

	const recommendedBuddies = data?.recommendedBuddies || []
	const buddyNames = useUserNames(recommendedBuddies.map((buddy) => buddy.userId))
	const isLoading = userLoading || matchesLoading

	const filteredBuddies = useMemo(() => {
		const term = searchTerm.trim().toLowerCase()
		if (!term) return recommendedBuddies

		return recommendedBuddies.filter((buddy) => {
			const idMatch = buddy.userId.toLowerCase().includes(term)
			const courseMatch = (buddy.sharedCourses || []).some((course) =>
				course.toLowerCase().includes(term)
			)
			const topicMatch = (buddy.sharedTopics || []).some((topic) =>
				topic.toLowerCase().includes(term)
			)
			return idMatch || courseMatch || topicMatch
		})
	}, [recommendedBuddies, searchTerm])

	const handleOpenDetails = (buddyId) => {
		navigate(`/matching/${buddyId}`)
	}

	const handleMessage = async (buddyId) => {
		try {
			setActionError('')
			const result = await getOrCreateConversation({
				variables: { otherUserId: buddyId },
			})
			const conversation = result?.data?.getOrCreateConversation
			if (conversation?.id) {
				navigate(`/messages/${conversation.id}`)
			}
		} catch (error) {
			setActionError(error.message || 'Unable to start a conversation')
		}
	}

	const handleSendBuddyRequest = async (buddyId) => {
		try {
			setActionError('')
			await sendBuddyRequest({ variables: { toUserId: buddyId } })
		} catch (error) {
			setActionError(error.message || 'Unable to send buddy request')
		}
	}

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<Spinner size="lg" />
			</div>
		)
	}

	if (!user) {
		return (
			<div className="max-w-4xl mx-auto p-6 text-center text-[#5A5A5A]">
				Please log in to view your matches.
			</div>
		)
	}

	return (
		<div className="max-w-6xl mx-auto">
			<div className="mb-6">
				<h1
					className="text-3xl font-bold text-[#2B2B2B] mb-2"
					style={{ fontFamily: 'Poppins, sans-serif' }}
				>
					Find Study Buddies
				</h1>
				<p className="text-[#5A5A5A]">
					Discover students who match your courses and study preferences
				</p>
			</div>

			<div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
				<div className="relative">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A5A]" />
					<input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search by user id, course, or topic..."
						className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
					/>
				</div>
			</div>

			{actionError && (
				<div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-red-700 text-sm">{actionError}</p>
				</div>
			)}

			{filteredBuddies.length === 0 ? (
				<Card padding="lg">
					<div className="text-center py-8">
						<Users className="w-16 h-16 text-[#5A5A5A] mx-auto mb-4 opacity-50" />
						<h3 className="text-xl font-semibold text-[#2B2B2B] mb-2">
							No matches found
						</h3>
						<p className="text-[#5A5A5A]">
							Try adjusting your search or update your preferences.
						</p>
					</div>
				</Card>
			) : (
				<div className="grid md:grid-cols-2 gap-6">
					{filteredBuddies.map((buddy) => (
						<div
							key={buddy.userId}
							className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
							onClick={() => handleOpenDetails(buddy.userId)}
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-4">
									<div className="w-16 h-16 bg-gradient-to-br from-[#C76B4F] to-[#E76F51] rounded-full flex items-center justify-center text-white text-2xl font-bold">
										{(buddy.name || buddyNames[buddy.userId] || 'Buddy').charAt(0).toUpperCase()}
									</div>
									<div>
										<h3 className="text-xl font-semibold text-[#2B2B2B]">
											{buddy.name || buddyNames[buddy.userId] || 'Study buddy'}
										</h3>
										<p className="text-[#5A5A5A] text-sm">
											{buddy.sharedCourses.length} shared course
											{buddy.sharedCourses.length !== 1 ? 's' : ''}
										</p>
										<p className="text-[#5A5A5A] text-sm">
											{buddy.sharedTopics.length} shared topic
											{buddy.sharedTopics.length !== 1 ? 's' : ''}
										</p>
									</div>
								</div>
								<div className="text-right">
									<div className="flex items-center gap-1 mb-1">
										<Star className="w-5 h-5 text-[#4CAF50] fill-current" />
										<span className="text-2xl font-bold text-[#4CAF50]">
											{buddy.score}%
										</span>
									</div>
									<p className="text-xs text-[#5A5A5A]">Match</p>
								</div>
							</div>

							<div className="mb-4">
								<div className="flex items-center gap-2 mb-2 text-sm text-[#5A5A5A]">
									<BookOpen className="w-4 h-4" />
									<span>Shared Courses:</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{buddy.sharedCourses.slice(0, 3).map((course) => (
										<span
											key={course}
											className="px-3 py-1 bg-[#F4E3C8] text-[#2B2B2B] rounded-full text-sm"
										>
											{course}
										</span>
									))}
									{buddy.sharedCourses.length > 3 && (
										<span className="px-3 py-1 bg-[#F4E3C8] text-[#2B2B2B] rounded-full text-sm">
											+{buddy.sharedCourses.length - 3} more
										</span>
									)}
								</div>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation()
										handleOpenDetails(buddy.userId)
									}}
									className="flex-1 px-4 py-2 bg-[#4F7CAC] text-white rounded-lg hover:bg-[#446A96] transition-colors text-sm"
								>
									View Profile
								</button>
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation()
										handleMessage(buddy.userId)
									}}
									className="flex-1 px-4 py-2 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors text-sm"
								>
									Message
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default MatchingPage
