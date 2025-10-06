import React, { useState, useEffect } from 'react';

const EditQuestionModal = ({ question, courses, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    question: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    explanation: '',
    difficulty: 'medium',
    tags: [],
    isAnonymous: false
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'question':
        if (!value.trim()) {
          error = 'Question is required';
        } else if (value.trim().length < 10) {
          error = 'Question must be at least 10 characters long';
        }
        break;
      case 'explanation':
        if (value && value.trim().length < 10) {
          error = 'Explanation must be at least 10 characters long';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const validateOptions = (options) => {
    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      return 'At least 2 options are required';
    }
    if (validOptions.length > 6) {
      return 'Maximum 6 options allowed';
    }
    const hasCorrectOption = validOptions.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      return 'At least one option must be marked as correct';
    }
    return '';
  };

  useEffect(() => {
    if (question) {
      setFormData({
        question: question.question || '',
        options: question.options || [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        tags: question.tags || [],
        isAnonymous: question.isAnonymous || false
      });
    }
  }, [question]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Live validation - validate as user types
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({
      ...touched,
      [name]: true
    });
    
    const error = validateField(name, value);
    setErrors({
      ...errors,
      [name]: error
    });
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = formData.options.map((option, i) => 
      i === index ? { ...option, [field]: value } : option
    );
    
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
    
    // Live validation for options
    if (touched.options) {
      const optionsError = validateOptions(newOptions);
      setErrors({
        ...errors,
        options: optionsError
      });
    }
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, { text: '', isCorrect: false }]
      }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    const fieldsToValidate = ['question', 'explanation'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    // Validate options
    const optionsError = validateOptions(formData.options);
    if (optionsError) {
      newErrors.options = optionsError;
    }
    
    setErrors(newErrors);
    setTouched({
      question: true,
      explanation: true,
      options: true
    });
    
    // If there are validation errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const validOptions = formData.options.filter(option => option.text.trim());
      await onSave({
        ...formData,
        options: validOptions
      });
    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Question</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question *
              </label>
              <textarea
                name="question"
                value={formData.question}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  touched.question && errors.question 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
                placeholder="Enter your question here..."
                required
              />
              {touched.question && errors.question && (
                <p className="mt-1 text-sm text-red-600">{errors.question}</p>
              )}
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              {touched.options && errors.options && (
                <p className="mb-2 text-sm text-red-600">{errors.options}</p>
              )}
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {formData.options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + Add Option
                  </button>
                )}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation
              </label>
              <textarea
                name="explanation"
                value={formData.explanation}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  touched.explanation && errors.explanation 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
                placeholder="Explain why the correct answer is correct..."
              />
              {touched.explanation && errors.explanation && (
                <p className="mt-1 text-sm text-red-600">{errors.explanation}</p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleTagAdd}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Anonymous */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isAnonymous"
                checked={formData.isAnonymous}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Submit anonymously
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
