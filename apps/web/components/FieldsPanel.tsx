"use client";

import { useState, useEffect } from "react";
import { RefreshCw, User, Calendar, FileText, AlertCircle, Sparkles, Save, Edit3, Check, X } from "lucide-react";
import type { ExtractedFields } from "@/lib/types";

interface FieldsPanelProps {
  fields: ExtractedFields | null;
  onExtract: () => Promise<void>;
  onUpdate?: (fields: ExtractedFields) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function FieldsPanel({
  fields,
  onExtract,
  onUpdate,
  isLoading,
  disabled,
}: FieldsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [editableFields, setEditableFields] = useState<ExtractedFields | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync editable fields with props
  useEffect(() => {
    if (fields) {
      setEditableFields({ ...fields });
    }
  }, [fields]);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      await onExtract();
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedFields, value: any) => {
    if (!editableFields) return;
    setEditableFields({ ...editableFields, [field]: value });
    setHasChanges(true);
  };

  const handleSymptomChange = (index: number, value: string) => {
    if (!editableFields) return;
    const newSymptoms = [...editableFields.symptoms];
    newSymptoms[index] = value;
    setEditableFields({ ...editableFields, symptoms: newSymptoms });
    setHasChanges(true);
  };

  const handleAddSymptom = () => {
    if (!editableFields) return;
    setEditableFields({ 
      ...editableFields, 
      symptoms: [...editableFields.symptoms, ""] 
    });
    setHasChanges(true);
  };

  const handleRemoveSymptom = (index: number) => {
    if (!editableFields) return;
    const newSymptoms = editableFields.symptoms.filter((_, i) => i !== index);
    setEditableFields({ ...editableFields, symptoms: newSymptoms });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (editableFields && onUpdate) {
      onUpdate(editableFields);
      setHasChanges(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (fields) {
      setEditableFields({ ...fields });
    }
    setHasChanges(false);
    setIsEditing(false);
  };

  const loading = isLoading || isExtracting;
  const displayFields = editableFields || fields;

  return (
    <div className="p-6 h-full overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Extracted Fields</h2>
            <p className="text-gray-500 mt-1">AI-powered field extraction from transcript</p>
          </div>
          <div className="flex gap-2">
            {displayFields && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges}
                      className="btn-success flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleExtract}
              disabled={disabled || loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? "Extracting..." : displayFields ? "Re-extract" : "Extract Fields"}
            </button>
          </div>
        </div>

        {!displayFields ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No fields extracted yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Record some conversation first, then click "Extract Fields" to analyze the transcript with AI.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Edit mode indicator */}
            {isEditing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Edit Mode</p>
                  <p className="text-sm text-blue-700">You can modify any field. Click "Save Changes" when done.</p>
                </div>
              </div>
            )}

            {/* Patient Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                Patient Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <EditableField 
                  label="Name" 
                  value={displayFields.patient_name || ""} 
                  onChange={(v) => handleFieldChange("patient_name", v)}
                  isEditing={isEditing}
                />
                <EditableField 
                  label="Date of Birth" 
                  value={displayFields.dob || ""} 
                  onChange={(v) => handleFieldChange("dob", v)}
                  isEditing={isEditing}
                  icon={<Calendar className="w-4 h-4 text-gray-400" />} 
                />
              </div>
            </div>

            {/* Visit Info Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                Visit Information
              </h3>
              <EditableField 
                label="Reason for Visit" 
                value={displayFields.reason_for_visit || ""} 
                onChange={(v) => handleFieldChange("reason_for_visit", v)}
                isEditing={isEditing}
                multiline
              />
              {(displayFields.timeline || isEditing) && (
                <div className="mt-4">
                  <EditableField 
                    label="Timeline" 
                    value={displayFields.timeline || ""} 
                    onChange={(v) => handleFieldChange("timeline", v)}
                    isEditing={isEditing}
                  />
                </div>
              )}
            </div>

            {/* Symptoms Card */}
            {(displayFields.symptoms.length > 0 || isEditing) && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-6 border border-rose-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  Patient-Reported Symptoms
                </h3>
                <ul className="space-y-3">
                  {displayFields.symptoms.map((symptom, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 bg-white/60 p-3 rounded-xl"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold mt-1">
                        {index + 1}
                      </span>
                      {isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={symptom}
                            onChange={(e) => handleSymptomChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                          <button
                            onClick={() => handleRemoveSymptom(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-700 italic">{symptom}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {isEditing && (
                  <button
                    onClick={handleAddSymptom}
                    className="mt-3 text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    + Add symptom
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Verbatim patient statements - not clinical interpretation
                </p>
              </div>
            )}

            {/* Allergies & Medications */}
            {((displayFields.allergies && displayFields.allergies.length > 0) || 
              (displayFields.medications && displayFields.medications.length > 0) || isEditing) && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                  <h3 className="font-semibold text-red-900 mb-3">Allergies</h3>
                  {isEditing ? (
                    <EditableList
                      items={displayFields.allergies || []}
                      onChange={(items) => handleFieldChange("allergies", items)}
                      color="red"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {(displayFields.allergies || []).map((allergy, index) => (
                        <li key={index} className="text-sm text-red-800 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          {allergy}
                        </li>
                      ))}
                      {(!displayFields.allergies || displayFields.allergies.length === 0) && (
                        <li className="text-sm text-gray-400 italic">None recorded</li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                  <h3 className="font-semibold text-purple-900 mb-3">Current Medications</h3>
                  {isEditing ? (
                    <EditableList
                      items={displayFields.medications || []}
                      onChange={(items) => handleFieldChange("medications", items)}
                      color="purple"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {(displayFields.medications || []).map((med, index) => (
                        <li key={index} className="text-sm text-purple-800 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          {med}
                        </li>
                      ))}
                      {(!displayFields.medications || displayFields.medications.length === 0) && (
                        <li className="text-sm text-gray-400 italic">None recorded</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  isEditing,
  icon,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1 mb-1">
        {icon}
        {label}
      </label>
      {isEditing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
        )
      ) : (
        <p className="text-gray-900 font-medium">
          {value || <span className="text-gray-400 italic font-normal">Not provided</span>}
        </p>
      )}
    </div>
  );
}

function EditableList({
  items,
  onChange,
  color,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  color: "red" | "purple";
}) {
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleAdd = () => {
    onChange([...items, ""]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const colorClasses = {
    red: "text-red-600 hover:bg-red-100",
    purple: "text-purple-600 hover:bg-purple-100",
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(index, e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
          />
          <button
            onClick={() => handleRemove(index)}
            className={`p-1.5 rounded-lg ${colorClasses[color]}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className={`text-sm font-medium ${colorClasses[color]}`}
      >
        + Add item
      </button>
    </div>
  );
}
