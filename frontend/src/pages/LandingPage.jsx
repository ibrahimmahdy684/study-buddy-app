import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Calendar, CheckCircle } from 'lucide-react'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import heroImage from '../assets/landing/hero-study.jpg'
import benefitsImage from '../assets/landing/benefits-campus.jpg'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F4E3C8]">
      <div className="relative isolate h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <ImageWithFallback
            src={heroImage}
            alt="Students studying together"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#C76B4F]/72 to-[#E76F51]/58"></div>
        </div>

        <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-4 lg:px-12">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                StudyBuddy
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-white text-[#C76B4F] rounded-lg hover:bg-white/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Find Your Perfect Study Partner
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Connect with university students who share your courses, study style, and schedule. Make learning collaborative and fun.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-[#C76B4F] rounded-xl text-lg hover:bg-white/90 transition-all transform hover:scale-105 shadow-lg"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            Start Studying Together
          </button>
        </div>
      </div>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#2B2B2B] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            How StudyBuddy Works
          </h2>
          <p className="text-center text-[#5A5A5A] text-lg mb-16 max-w-2xl mx-auto">
            Three simple steps to find your ideal study partner and ace your courses together
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#F4E3C8] rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#C76B4F] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create Your Profile
              </h3>
              <p className="text-[#5A5A5A]">
                Add your university, courses, study preferences, and availability to help us find the perfect matches for you.
              </p>
            </div>

            <div className="bg-[#F4E3C8] rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#E76F51] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Get Matched
              </h3>
              <p className="text-[#5A5A5A]">
                Our smart algorithm matches you with students who share your courses, study style, and schedule.
              </p>
            </div>

            <div className="bg-[#F4E3C8] rounded-xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#4F7CAC] rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Study Together
              </h3>
              <p className="text-[#5A5A5A]">
                Schedule study sessions, chat with your buddies, and collaborate to achieve your academic goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#F4E3C8]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#2B2B2B] mb-16" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Why Students Love StudyBuddy
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Better Grades
                    </h3>
                    <p className="text-[#5A5A5A]">Students who study in groups perform 20% better on average</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Stay Motivated
                    </h3>
                    <p className="text-[#5A5A5A]">Having a study buddy keeps you accountable and motivated</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Build Friendships
                    </h3>
                    <p className="text-[#5A5A5A]">Connect with like-minded students and build lasting friendships</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2 text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Flexible Scheduling
                    </h3>
                    <p className="text-[#5A5A5A]">Find study partners that match your availability perfectly</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <ImageWithFallback
                src={benefitsImage}
                alt="University campus collaboration"
                className="rounded-xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-[#C76B4F] to-[#E76F51]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Ready to Transform Your Study Experience?
          </h2>
          <p className="text-xl text-white/90 mb-8">Join thousands of students already studying smarter, not harder</p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-[#C76B4F] rounded-xl text-lg hover:bg-white/90 transition-all transform hover:scale-105 shadow-lg"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            Create Your Free Account
          </button>
        </div>
      </section>

      <footer className="bg-[#2B2B2B] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-6 h-6" />
            <span className="text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>
              StudyBuddy
            </span>
          </div>
          <p className="text-white/70">© 2026 StudyBuddy. Helping students succeed together.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
