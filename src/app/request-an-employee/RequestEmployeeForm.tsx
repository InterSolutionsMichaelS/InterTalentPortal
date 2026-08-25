"use client";

import { FormEvent, useEffect, useState } from "react";

interface FormData {
  managementCompany: string;
  propertyName: string;

  streetAddress: string;
  city: string;
  state: string;

  positionType: string;
  positionTitle: string;
  duties: string;

  startDate: string;
  schedule: string;

  contactTitle: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;

  contactMethod: string;
  bestTimeToRespond: string;
}

const initialFormData: FormData = {
  managementCompany: "",
  propertyName: "",

  streetAddress: "",
  city: "",
  state: "",

  positionType: "",
  positionTitle: "",
  duties: "",

  startDate: "",
  schedule: "",

  contactTitle: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",

  contactMethod: "",
  bestTimeToRespond: "",
};

export default function RequestEmployeeForm() {
  const [formData, setFormData] =
    useState<FormData>(initialFormData);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!submitted) return;

    const timer = window.setTimeout(() => {
      window.location.href =
        "https://intertalent.intersolutions.com";
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [submitted]);

  function updateField(
    field: keyof FormData,
    value: string
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/staffing-request", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...formData,
            portalSource: "InterSolutions Website",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit request.");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Request employee submission failed:", err);

      setError(
        "We were unable to submit your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Thank you for your request!
        </h2>

        <p className="mt-4 text-gray-600">
          Your staffing request has been successfully submitted
          to InterSolutions.
        </p>

        <p className="mt-2 text-gray-600">
          A member of our team will be in touch with you shortly.
        </p>

        <p className="mt-6 text-sm text-gray-500">
          You will be redirected to InterTalent in 5 seconds.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900">
        Property Information
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Input
          label="Management Company"
          value={formData.managementCompany}
          onChange={(value) =>
            updateField("managementCompany", value)
          }
          required
        />

        <Input
          label="Property Name"
          value={formData.propertyName}
          onChange={(value) =>
            updateField("propertyName", value)
          }
          required
        />

        <Input
          label="Street Address"
          value={formData.streetAddress}
          onChange={(value) =>
            updateField("streetAddress", value)
          }
          required
        />

        <Input
          label="City"
          value={formData.city}
          onChange={(value) => updateField("city", value)}
          required
        />

        <Input
          label="State"
          value={formData.state}
          onChange={(value) => updateField("state", value)}
          required
        />
      </div>

      <hr className="my-8" />

      <h2 className="text-2xl font-bold text-gray-900">
        Staffing Request
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Input
          label="Position Type"
          value={formData.positionType}
          onChange={(value) =>
            updateField("positionType", value)
          }
          required
        />

        <Input
          label="Position Title"
          value={formData.positionTitle}
          onChange={(value) =>
            updateField("positionTitle", value)
          }
        />

        <Input
          label="Start Date"
          type="date"
          value={formData.startDate}
          onChange={(value) =>
            updateField("startDate", value)
          }
          required
        />

        <Input
          label="Schedule"
          value={formData.schedule}
          onChange={(value) =>
            updateField("schedule", value)
          }
        />
      </div>

      <div className="mt-6">
        <label className="mb-2 block font-medium text-gray-700">
          Duties
        </label>

        <textarea
          value={formData.duties}
          onChange={(event) =>
            updateField("duties", event.target.value)
          }
          rows={4}
          className="w-full rounded-lg border border-gray-500 text-gray-600 px-4 py-3 outline-none focus:border-blue-500"
        />
      </div>

      <hr className="my-8" />

      <h2 className="text-2xl font-bold text-gray-900">
        Contact Information
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Input
          label="First Name"
          value={formData.firstName}
          onChange={(value) =>
            updateField("firstName", value)
          }
          required
        />

        <Input
          label="Last Name"
          value={formData.lastName}
          onChange={(value) =>
            updateField("lastName", value)
          }
          required
        />

        <Input
          label="Title"
          value={formData.contactTitle}
          onChange={(value) =>
            updateField("contactTitle", value)
          }
        />

        <Input
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={(value) => updateField("phone", value)}
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(value) => updateField("email", value)}
          required
        />

        <Input
          label="Preferred Contact Method"
          value={formData.contactMethod}
          onChange={(value) =>
            updateField("contactMethod", value)
          }
        />

        <Input
          label="Best Time to Respond"
          value={formData.bestTimeToRespond}
          onChange={(value) =>
            updateField("bestTimeToRespond", value)
          }
        />
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-8 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Submitting Request..."
            : "Submit Request"}
        </button>
      </div>
    </form>
  );
}

interface InputProps {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

function Input({
  label,
  value,
  type = "text",
  required = false,
  onChange,
}: InputProps) {
  return (
    <div>
      <label className="mb-2 block font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-600 text-gray-600 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

interface FormRowProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormRow({
  label,
  required = false,
  children,
}: FormRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-2 md:gap-5 items-start">

      <label className="md:text-right font-semibold text-sm text-gray-900 pt-2">
        {label}

        {required && (
          <span className="text-red-600 ml-1">*</span>
        )}
      </label>

      <div>
        {children}
      </div>

    </div>
  );
}

