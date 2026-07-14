'use client';

import { useState } from 'react';

type StaffingRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function StaffingRequestModal({
  isOpen,
  onClose,
}: StaffingRequestModalProps) {

    const [managementCompany, setManagementCompany] = useState('');
    const [propertyName, setPropertyName] = useState('');

    const [streetAddress, setStreetAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const [positionType, setPositionType] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const [positionTitle, setPositionTitle] = useState('');
    const [duties, setDuties] = useState('');
    const [startDate, setStartDate] = useState('');
    const [schedule, setSchedule] = useState('');

    const [contactTitle, setContactTitle] = useState('');
    const [contactMethod, setContactMethod] = useState('');
    const [bestTimeToRespond, setBestTimeToRespond] = useState('');

    const [validationError, setValidationError] = useState('');

    const handleSubmit = async () => {
        try {

            setValidationError('');


            if (
                !firstName.trim() ||
                !lastName.trim() ||
                !contactTitle.trim() ||
                !phone.trim() ||
                !email.trim() ||
                !contactMethod.trim()
            ) {
                setValidationError('Please complete your name, phone number, email address, and preferred contact method before submitting.');

            return;
            }

            const response = await fetch(
            '/api/staffing-request',
            {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                managementCompany,
                propertyName,

                streetAddress,
                city,
                state,

                positionType,
                positionTitle,
                duties,
                startDate,
                schedule,
                
                contactTitle,
                firstName,
                lastName,
                phone,
                email,

                contactMethod,
                bestTimeToRespond,
                }),
            }
            );

            const routing = await response.json();

            console.log(
            'Routing Result:',
            routing
            );

            alert(
            `Nearest Office: ${routing.officeName}`
            );
        } catch (error) {
            console.error(error);

            alert('Routing failed');
        }
    };


  return (
    <div
        className={`
            fixed
            right-4
            bottom-0
            top-[168px]
            z-50

            flex
            justify-end

            origin-bottom-right
            transition-gpu
            duration-300
            ease-out
            duration-500
            ease-[cubic-bezier(0.22,1,0.36,1)]

            ${
            isOpen
                ? 'scale-100 opacity-100'
                : 'scale-80 opacity-0 pointer-events-none'
            }
        `}
    >
      <div
        className="
            h-full
            w-[500px]
            max-w-xl
            bg-white
            shadow-2xl
            flex
            flex-col
            border-l
            rounded-t-2xl
            border-gray-200
            overflow-hidden
        "
      >
        <div className="bg-[#022949] px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            Submit a Staffing Request
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

        <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#022949]">
            Request an Employee
            </h3>

            <p className="mt-2 text-gray-600">
            Are you looking for an outstanding new employee?
            Please fill out the form below and an InterSolutions
            staffing expert will contact you.
            </p>
        </div>

        {/* JOB INFORMATION */}
        <div className="mb-6">
            <h4 className="mb-4 border-b pb-2 text-lg font-bold text-[#022949]">
            Job Information
            </h4>

            <div className="space-y-4">

            <div>
                <label className="mb-1 block font-medium">
                Management Company
                </label>

                <input
                    type="text"
                    value={managementCompany}
                    onChange={(e) =>
                        setManagementCompany(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Property Name *
                </label>

                <input
                    type="text"
                    value={propertyName}
                    onChange={(e) =>
                        setPropertyName(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Street Address *
                </label>

                <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) =>
                        setStreetAddress(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">

                <div>
                <label className="mb-1 block font-medium">
                    City
                </label>

                <input
                    type="text"
                    value={city}
                    onChange={(e) =>
                        setCity(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
                </div>

                <div>
                <label className="mb-1 block font-medium">
                    State
                </label>

                <input
                    type="text"
                    value={state}
                    onChange={(e) =>
                        setState(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
                </div>

            </div>

            {/* POSITION TYPE */}

            <div>
                <label className="mb-2 block font-medium">
                What type of position are you looking for?
                </label>

                <div className="space-y-2">

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="positionType"
                        checked={positionType === 'Temp'}
                        onChange={() => setPositionType('Temp')}
                    />
                    <span>Temp</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="positionType"
                        checked={positionType === 'Temp to Perm'}
                        onChange={() => setPositionType('Temp to Perm')}
                    />
                    <span>Temp to Perm</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="positionType"
                        checked={positionType === 'Direct Hire'}
                        onChange={() => setPositionType('Direct Hire')}
                    />
                    <span>Direct Hire</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="positionType"
                        checked={positionType === 'Jumpstart Payrolling'}
                        onChange={() => setPositionType('Jumpstart Payrolling')}
                    />
                    <span>JumpStart Payrolling</span>
                </label>

                </div>
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Position Title *
                </label>

                <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) =>
                        setPositionTitle(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Duties & Responsibilities *
                </label>

                <textarea
                    rows={4}
                    value={duties}
                    onChange={(e) =>
                        setDuties(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Start Date *
                </label>

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                        setStartDate(e.target.value)
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Schedule *
                </label>

                <textarea
                    rows={3}
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Please provide start/end times and days of the week."
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                How did you hear about us?
                </label>

                <input
                type="text"
                className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            </div>
        </div>

        {/* CONTACT INFO */}

        <div>
            <h4 className="mb-4 border-b pb-2 text-lg font-bold text-[#022949]">
            Your Contact Information
            </h4>

            {validationError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {validationError}
                </div>
            )}

            <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">

                <div>
                <label className="mb-1 block font-medium">
                    First Name *
                </label>

                <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                />
                </div>

                <div>
                <label className="mb-1 block font-medium">
                    Last Name *
                </label>

                <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                />
                </div>

            </div>

            <div>
                <label className="mb-1 block font-medium">
                Title
                </label>

                <input
                    type="text"
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Phone *
                </label>

                <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Email *
                </label>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">
                Best way to reach you
                </label>

                <div className="space-y-2">

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="contactMethod"
                        checked={contactMethod === 'Phone'}
                        onChange={() => setContactMethod('Phone')}
                    />
                    <span>Phone</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="contactMethod"
                        checked={contactMethod === 'Email'}
                        onChange={() => setContactMethod('Email')}
                    />
                    <span>Email</span>
                </label>

                </div>
            </div>

            <div>
                <label className="mb-1 block font-medium">
                Best Time To Respond
                </label>

                <input
                    type="text"
                    value={bestTimeToRespond}
                    onChange={(e) =>
                        setBestTimeToRespond(e.target.value)
                    }
                    placeholder="Morning, Afternoon, After 3 PM, etc."
                    className="w-full rounded-lg border px-3 py-2"
                />
            </div>

            </div>
        </div>

        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-400 px-4 py-2"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-[#FF30AF] px-4 py-2 font-semibold text-white"
            >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}