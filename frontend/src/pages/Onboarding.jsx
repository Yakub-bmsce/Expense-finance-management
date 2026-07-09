import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Input from '../components/Input';
import Button from '../components/Button';
import { User, Home, Award, ArrowRight, ArrowLeft } from 'lucide-react';

const Onboarding = () => {
  const { user, submitOnboarding } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('next'); // next / prev for animation handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [college, setCollege] = useState('');
  const [mobile, setMobile] = useState('');
  const [livingType, setLivingType] = useState(''); // bachelor / family
  const [pgHostelFlat, setPgHostelFlat] = useState(''); // pg / hostel / flat
  const [rooms, setRooms] = useState(''); // 1 / 2 / 3 / custom
  const [customRooms, setCustomRooms] = useState('');

  const [validationErrors, setValidationErrors] = useState({});

  const handleNext = () => {
    // Validate Step 1
    if (step === 1) {
      const errs = {};
      if (!fullName.trim()) errs.fullName = 'Full name is required';
      if (!gender) errs.gender = 'Please select a gender';
      if (!age) {
        errs.age = 'Age is required';
      } else if (isNaN(age) || parseInt(age, 10) <= 0) {
        errs.age = 'Please enter a valid age';
      }
      if (!college.trim()) errs.college = 'College is required';
      
      if (Object.keys(errs).length > 0) {
        setValidationErrors(errs);
        return;
      }
      setValidationErrors({});
    }

    // Validate Step 2
    if (step === 2) {
      if (!livingType) {
        setError('Please select your living type');
        return;
      }
      setError('');
    }

    setDirection('next');
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setDirection('prev');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepare details
    const livingDetails = {};
    if (livingType === 'bachelor') {
      livingDetails.pg_hostel_flat = pgHostelFlat;
      if (pgHostelFlat === 'flat') {
        livingDetails.rooms = rooms === 'custom' ? customRooms : rooms;
      }
    }

    const payload = {
      fullName,
      gender,
      age: parseInt(age, 10),
      college,
      mobile: mobile || null,
      livingType,
      livingDetails
    };

    try {
      await submitOnboarding(payload);
      navigate('/'); // Routes user to Room Setup (since they are onboarded now but have no room yet)
    } catch (err) {
      setError(err.message || 'Onboarding submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-8 px-2 select-none">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-brandIndigo text-white' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Profile</span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-slate-800">
            <div className={`h-full bg-brandIndigo transition-all duration-300 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}></div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-brandIndigo text-white' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Living Type</span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-slate-800">
            <div className={`h-full bg-brandIndigo transition-all duration-300 ${step < 3 ? 'w-0' : 'w-full'}`}></div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-brandIndigo text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Details</span>
          </div>
        </div>

        <GlassCard className="relative overflow-hidden min-h-[480px] flex flex-col justify-between">
          <div>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="animate-slide-in space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-brandIndigo">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100 select-none">Personal Profile</h2>
                    <p className="text-slate-400 text-xs select-none">Tell us a bit about yourself to set up your profile card.</p>
                  </div>
                </div>

                <Input
                  label="Full Name"
                  id="fullName"
                  placeholder="Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={validationErrors.fullName}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-300 select-none">Gender</label>
                    <select
                      className="glass-input h-[50px] py-0 cursor-pointer"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-500">Select...</option>
                      <option value="Male" className="bg-slate-900">Male</option>
                      <option value="Female" className="bg-slate-900">Female</option>
                      <option value="Non-binary" className="bg-slate-900">Non-binary</option>
                      <option value="Prefer not to say" className="bg-slate-900">Other</option>
                    </select>
                    {validationErrors.gender && (
                      <span className="text-xs text-red-400 font-medium select-none mt-1">{validationErrors.gender}</span>
                    )}
                  </div>

                  <Input
                    label="Age"
                    id="age"
                    type="number"
                    placeholder="22"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    error={validationErrors.age}
                  />
                </div>

                <Input
                  label="College / University"
                  id="college"
                  placeholder="State University"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  error={validationErrors.college}
                />

                <Input
                  label="Mobile Number (Optional)"
                  id="mobile"
                  placeholder="+1 (555) 123-4567"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="animate-slide-in space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-brandPurple">
                    <Home size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100 select-none">Living Arrangement</h2>
                    <p className="text-slate-400 text-xs select-none">What describes your current household living setup?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bachelor option */}
                  <div
                    onClick={() => setLivingType('bachelor')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-3 ${livingType === 'bachelor' ? 'border-brandIndigo bg-indigo-500/5 shadow-glass-hover' : 'border-glassBorder hover:border-white/10'}`}
                  >
                    <div className={`p-4 rounded-full ${livingType === 'bachelor' ? 'bg-brandIndigo text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-lg">Bachelor</h3>
                      <p className="text-xs text-slate-400 mt-1">Living with friends, roommates, or in student housing.</p>
                    </div>
                  </div>

                  {/* Family option */}
                  <div
                    onClick={() => setLivingType('family')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-3 ${livingType === 'family' ? 'border-brandPurple bg-purple-500/5 shadow-glass-hover' : 'border-glassBorder hover:border-white/10'}`}
                  >
                    <div className={`p-4 rounded-full ${livingType === 'family' ? 'bg-brandPurple text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-lg">Family</h3>
                      <p className="text-xs text-slate-400 mt-1">Living with spouse, children, or family members.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="animate-slide-in space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-brandPurple">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100 select-none">Housing Specifics</h2>
                    <p className="text-slate-400 text-xs select-none">Help us map the layout of your household.</p>
                  </div>
                </div>

                {livingType === 'family' ? (
                  <div className="py-6 text-center text-slate-300 bg-slate-900/40 rounded-2xl border border-glassBorder">
                    <p className="font-medium mb-1">Family Living Selected</p>
                    <p className="text-xs text-slate-500">Your profile is ready to join or create family rooms.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PG / Hostel / Flat */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-300 select-none">Select Housing Category</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['pg', 'hostel', 'flat'].map((type) => (
                          <div
                            key={type}
                            onClick={() => {
                              setPgHostelFlat(type);
                              if (type !== 'flat') {
                                setRooms('');
                                setCustomRooms('');
                              }
                            }}
                            className={`py-3 px-2 text-center rounded-xl cursor-pointer font-semibold uppercase text-xs border transition-all duration-200 ${pgHostelFlat === type ? 'border-brandIndigo bg-indigo-500/10 text-indigo-300' : 'border-glassBorder text-slate-400 hover:border-white/10'}`}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Flat Rooms selection (only if Flat is selected) */}
                    {pgHostelFlat === 'flat' && (
                      <div className="flex flex-col gap-2 animate-fade-in">
                        <label className="text-sm font-medium text-slate-300 select-none">Number of Rooms</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['1', '2', '3', 'custom'].map((item) => (
                            <div
                              key={item}
                              onClick={() => setRooms(item)}
                              className={`py-3 px-2 text-center rounded-xl cursor-pointer font-semibold text-sm border transition-all duration-200 ${rooms === item ? 'border-brandIndigo bg-indigo-500/10 text-indigo-300' : 'border-glassBorder text-slate-400 hover:border-white/10'}`}
                            >
                              {item === 'custom' ? 'Custom' : `${item} BHK`}
                            </div>
                          ))}
                        </div>

                        {rooms === 'custom' && (
                          <Input
                            id="customRooms"
                            type="number"
                            placeholder="Enter number of rooms (e.g. 4)"
                            value={customRooms}
                            onChange={(e) => setCustomRooms(e.target.value)}
                            className="mt-2 animate-fade-in"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex gap-4 mt-8 pt-4 border-t border-glassBorder select-none">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={loading}
                className="flex-[1]"
              >
                <ArrowLeft size={18} />
                Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                className="flex-[2]"
              >
                Next Step
                <ArrowRight size={18} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={
                  (livingType === 'bachelor' && !pgHostelFlat) ||
                  (pgHostelFlat === 'flat' && !rooms) ||
                  (rooms === 'custom' && !customRooms)
                }
                className="flex-[2]"
              >
                Finish & Go
              </Button>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Onboarding;
