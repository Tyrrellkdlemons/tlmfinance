/**
 * TLM Finance - Enrollment Wizard Component
 * =========================================
 * Multi-step wizard for enrolling in Pathways Home program
 * Clean, guided experience with validation
 */

import { Component, html, escapeHtml } from './Component.js';
import { store } from '../store.js';
import { router } from '../router.js';

export class EnrollmentWizard extends Component {
  constructor(container, route) {
    super(container, route);

    this.state = {
      currentStep: 1,
      totalSteps: 4,
      formData: {
        // Step 1: Personal Info
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',

        // Step 2: Current Situation
        housingStatus: '',
        employmentStatus: '',
        monthlyIncome: '',
        householdSize: '',

        // Step 3: Program Goals
        primaryGoals: [],
        challenges: '',
        supportNeeded: [],

        // Step 4: Consent & Commitment
        agreedToTerms: false,
        agreedToCoaching: false,
        preferredStartDate: ''
      },
      errors: {},
      submitting: false
    };
  }

  async beforeRender() {
    // Check if already enrolled
    const enrollment = store.getState('enrollment');
    if (enrollment && enrollment.program_status === 'ACTIVE') {
      router.navigate('/dashboard');
      return;
    }

    // Pre-fill from user profile if available
    const user = store.getState('user');
    if (user) {
      this.setState({
        formData: {
          ...this.state.formData,
          fullName: user.user_metadata?.full_name || '',
          email: user.email || ''
        }
      });
    }
  }

  template() {
    const { currentStep, totalSteps, formData, errors, submitting } = this.state;

    return html`
      <div class="enrollment-wizard">
        <div class="wizard-container">
          <!-- Progress Bar -->
          <div class="wizard-progress">
            <div class="wizard-steps">
              ${Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => html`
                <div class="wizard-step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}">
                  <div class="step-number">${step < currentStep ? '✓' : step}</div>
                  <div class="step-label">${this._getStepLabel(step)}</div>
                </div>
              `).join('')}
            </div>
            <div class="wizard-progress-bar">
              <div class="wizard-progress-fill" style="width: ${((currentStep - 1) / (totalSteps - 1)) * 100}%"></div>
            </div>
          </div>

          <!-- Step Content -->
          <div class="wizard-content">
            <form class="wizard-form" data-ref="enrollmentForm">
              ${this._renderStep(currentStep)}
            </form>
          </div>

          <!-- Navigation -->
          <div class="wizard-navigation">
            ${currentStep > 1 ? html`
              <button type="button" class="btn btn--secondary" data-ref="prevBtn">
                ← Previous
              </button>
            ` : html`
              <a href="#/" class="btn btn--secondary">Cancel</a>
            `}

            ${currentStep < totalSteps ? html`
              <button type="button" class="btn btn--primary" data-ref="nextBtn">
                Next →
              </button>
            ` : html`
              <button
                type="button"
                class="btn btn--primary"
                data-ref="submitBtn"
                ${submitting ? 'disabled' : ''}
              >
                ${submitting ? 'Enrolling...' : 'Complete Enrollment'}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  _renderStep(step) {
    switch (step) {
      case 1:
        return this._renderPersonalInfo();
      case 2:
        return this._renderCurrentSituation();
      case 3:
        return this._renderGoals();
      case 4:
        return this._renderConsent();
      default:
        return '';
    }
  }

  _renderPersonalInfo() {
    const { formData, errors } = this.state;

    return html`
      <div class="wizard-step-content">
        <h2>Let's Get Started</h2>
        <p class="step-description">Tell us a bit about yourself to begin your journey.</p>

        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value="${escapeHtml(formData.fullName)}"
            class="form-control ${errors.fullName ? 'error' : ''}"
            required
          />
          ${errors.fullName ? html`<span class="error-message">${errors.fullName}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value="${escapeHtml(formData.email)}"
            class="form-control ${errors.email ? 'error' : ''}"
            required
          />
          ${errors.email ? html`<span class="error-message">${errors.email}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value="${escapeHtml(formData.phone)}"
            placeholder="(555) 123-4567"
            class="form-control ${errors.phone ? 'error' : ''}"
            required
          />
          ${errors.phone ? html`<span class="error-message">${errors.phone}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="dateOfBirth">Date of Birth *</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value="${formData.dateOfBirth}"
            class="form-control ${errors.dateOfBirth ? 'error' : ''}"
            required
          />
          ${errors.dateOfBirth ? html`<span class="error-message">${errors.dateOfBirth}</span>` : ''}
        </div>
      </div>
    `;
  }

  _renderCurrentSituation() {
    const { formData, errors } = this.state;

    return html`
      <div class="wizard-step-content">
        <h2>Your Current Situation</h2>
        <p class="step-description">Help us understand where you're starting from.</p>

        <div class="form-group">
          <label for="housingStatus">Housing Status *</label>
          <select
            id="housingStatus"
            name="housingStatus"
            class="form-control ${errors.housingStatus ? 'error' : ''}"
            required
          >
            <option value="">Select your housing status</option>
            <option value="renting" ${formData.housingStatus === 'renting' ? 'selected' : ''}>Renting</option>
            <option value="temporary_shelter" ${formData.housingStatus === 'temporary_shelter' ? 'selected' : ''}>Temporary Shelter</option>
            <option value="living_with_family" ${formData.housingStatus === 'living_with_family' ? 'selected' : ''}>Living with Family/Friends</option>
            <option value="transitional_housing" ${formData.housingStatus === 'transitional_housing' ? 'selected' : ''}>Transitional Housing</option>
            <option value="other" ${formData.housingStatus === 'other' ? 'selected' : ''}>Other</option>
          </select>
          ${errors.housingStatus ? html`<span class="error-message">${errors.housingStatus}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="employmentStatus">Employment Status *</label>
          <select
            id="employmentStatus"
            name="employmentStatus"
            class="form-control ${errors.employmentStatus ? 'error' : ''}"
            required
          >
            <option value="">Select your employment status</option>
            <option value="employed_fulltime" ${formData.employmentStatus === 'employed_fulltime' ? 'selected' : ''}>Employed Full-Time</option>
            <option value="employed_parttime" ${formData.employmentStatus === 'employed_parttime' ? 'selected' : ''}>Employed Part-Time</option>
            <option value="self_employed" ${formData.employmentStatus === 'self_employed' ? 'selected' : ''}>Self-Employed</option>
            <option value="unemployed_looking" ${formData.employmentStatus === 'unemployed_looking' ? 'selected' : ''}>Unemployed (Looking)</option>
            <option value="unemployed_not_looking" ${formData.employmentStatus === 'unemployed_not_looking' ? 'selected' : ''}>Unemployed (Not Looking)</option>
            <option value="student" ${formData.employmentStatus === 'student' ? 'selected' : ''}>Student</option>
            <option value="disabled" ${formData.employmentStatus === 'disabled' ? 'selected' : ''}>Unable to Work</option>
          </select>
          ${errors.employmentStatus ? html`<span class="error-message">${errors.employmentStatus}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="monthlyIncome">Monthly Income *</label>
          <input
            type="number"
            id="monthlyIncome"
            name="monthlyIncome"
            value="${formData.monthlyIncome}"
            placeholder="0"
            min="0"
            step="1"
            class="form-control ${errors.monthlyIncome ? 'error' : ''}"
            required
          />
          <small class="form-hint">Include all sources of income (employment, benefits, etc.)</small>
          ${errors.monthlyIncome ? html`<span class="error-message">${errors.monthlyIncome}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="householdSize">Household Size *</label>
          <input
            type="number"
            id="householdSize"
            name="householdSize"
            value="${formData.householdSize}"
            placeholder="1"
            min="1"
            step="1"
            class="form-control ${errors.householdSize ? 'error' : ''}"
            required
          />
          <small class="form-hint">Number of people in your household</small>
          ${errors.householdSize ? html`<span class="error-message">${errors.householdSize}</span>` : ''}
        </div>
      </div>
    `;
  }

  _renderGoals() {
    const { formData, errors } = this.state;

    return html`
      <div class="wizard-step-content">
        <h2>Your Program Goals</h2>
        <p class="step-description">What do you hope to achieve through Pathways Home?</p>

        <div class="form-group">
          <label>Primary Goals * (Select all that apply)</label>
          <div class="checkbox-group">
            ${[
              { value: 'secure_stable_housing', label: 'Secure stable, permanent housing' },
              { value: 'increase_income', label: 'Increase monthly income' },
              { value: 'build_savings', label: 'Build emergency savings' },
              { value: 'reduce_debt', label: 'Reduce or eliminate debt' },
              { value: 'improve_credit', label: 'Improve credit score' },
              { value: 'financial_literacy', label: 'Learn financial management skills' }
            ].map(goal => html`
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  name="primaryGoals"
                  value="${goal.value}"
                  ${formData.primaryGoals.includes(goal.value) ? 'checked' : ''}
                />
                <span>${goal.label}</span>
              </label>
            `).join('')}
          </div>
          ${errors.primaryGoals ? html`<span class="error-message">${errors.primaryGoals}</span>` : ''}
        </div>

        <div class="form-group">
          <label for="challenges">What challenges are you currently facing?</label>
          <textarea
            id="challenges"
            name="challenges"
            rows="4"
            class="form-control"
            placeholder="Tell us about any barriers or challenges you're experiencing..."
          >${formData.challenges}</textarea>
          <small class="form-hint">This helps us provide better support</small>
        </div>

        <div class="form-group">
          <label>What kind of support would be most helpful? (Select all that apply)</label>
          <div class="checkbox-group">
            ${[
              { value: 'budgeting_help', label: 'Budgeting assistance' },
              { value: 'job_search', label: 'Job search support' },
              { value: 'credit_counseling', label: 'Credit counseling' },
              { value: 'housing_search', label: 'Housing search assistance' },
              { value: 'life_skills', label: 'Life skills training' },
              { value: 'childcare', label: 'Childcare resources' }
            ].map(support => html`
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  name="supportNeeded"
                  value="${support.value}"
                  ${formData.supportNeeded.includes(support.value) ? 'checked' : ''}
                />
                <span>${support.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  _renderConsent() {
    const { formData, errors } = this.state;

    return html`
      <div class="wizard-step-content">
        <h2>Program Commitment</h2>
        <p class="step-description">Review and agree to the program requirements.</p>

        <div class="info-box">
          <h3>Pathways Home is a 2-year program that includes:</h3>
          <ul>
            <li>4 quarters of guided financial planning</li>
            <li>Quarterly check-ins with your assigned coach</li>
            <li>Goal setting and milestone tracking</li>
            <li>Access to financial literacy resources</li>
            <li>Support for housing stability and independence</li>
          </ul>
        </div>

        <div class="form-group">
          <label for="preferredStartDate">Preferred Start Date *</label>
          <input
            type="date"
            id="preferredStartDate"
            name="preferredStartDate"
            value="${formData.preferredStartDate}"
            min="${new Date().toISOString().split('T')[0]}"
            class="form-control ${errors.preferredStartDate ? 'error' : ''}"
            required
          />
          ${errors.preferredStartDate ? html`<span class="error-message">${errors.preferredStartDate}</span>` : ''}
        </div>

        <div class="form-group">
          <label class="checkbox-label consent-checkbox">
            <input
              type="checkbox"
              name="agreedToTerms"
              ${formData.agreedToTerms ? 'checked' : ''}
              required
            />
            <span>
              I agree to the <a href="#/terms" target="_blank">program terms and conditions</a> *
            </span>
          </label>
          ${errors.agreedToTerms ? html`<span class="error-message">${errors.agreedToTerms}</span>` : ''}
        </div>

        <div class="form-group">
          <label class="checkbox-label consent-checkbox">
            <input
              type="checkbox"
              name="agreedToCoaching"
              ${formData.agreedToCoaching ? 'checked' : ''}
              required
            />
            <span>
              I commit to participating in quarterly coaching sessions and check-ins *
            </span>
          </label>
          ${errors.agreedToCoaching ? html`<span class="error-message">${errors.agreedToCoaching}</span>` : ''}
        </div>
      </div>
    `;
  }

  _getStepLabel(step) {
    const labels = {
      1: 'Personal Info',
      2: 'Current Situation',
      3: 'Goals',
      4: 'Commitment'
    };
    return labels[step] || '';
  }

  events() {
    // Previous button
    const prevBtn = this.refs.prevBtn;
    if (prevBtn) {
      this.addEventListener(prevBtn, 'click', () => this._previousStep());
    }

    // Next button
    const nextBtn = this.refs.nextBtn;
    if (nextBtn) {
      this.addEventListener(nextBtn, 'click', () => this._nextStep());
    }

    // Submit button
    const submitBtn = this.refs.submitBtn;
    if (submitBtn) {
      this.addEventListener(submitBtn, 'click', () => this._submitEnrollment());
    }

    // Form inputs - update state on change
    const form = this.refs.enrollmentForm;
    if (form) {
      this.addEventListener(form, 'input', (e) => this._handleInputChange(e));
      this.addEventListener(form, 'change', (e) => this._handleInputChange(e));
    }
  }

  _handleInputChange(e) {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      if (name === 'primaryGoals' || name === 'supportNeeded') {
        const currentValues = this.state.formData[name] || [];
        const newValues = checked
          ? [...currentValues, value]
          : currentValues.filter(v => v !== value);

        this.setState({
          formData: { ...this.state.formData, [name]: newValues }
        });
      } else {
        this.setState({
          formData: { ...this.state.formData, [name]: checked }
        });
      }
    } else {
      this.setState({
        formData: { ...this.state.formData, [name]: value }
      });
    }
  }

  _previousStep() {
    const { currentStep } = this.state;
    if (currentStep > 1) {
      this.setState({ currentStep: currentStep - 1, errors: {} });
    }
  }

  _nextStep() {
    const { currentStep } = this.state;

    // Validate current step
    const errors = this._validateStep(currentStep);

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    // Move to next step
    this.setState({
      currentStep: currentStep + 1,
      errors: {}
    });
  }

  _validateStep(step) {
    const { formData } = this.state;
    const errors = {};

    switch (step) {
      case 1:
        if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';
        if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
        break;

      case 2:
        if (!formData.housingStatus) errors.housingStatus = 'Housing status is required';
        if (!formData.employmentStatus) errors.employmentStatus = 'Employment status is required';
        if (!formData.monthlyIncome) errors.monthlyIncome = 'Monthly income is required';
        if (!formData.householdSize) errors.householdSize = 'Household size is required';
        break;

      case 3:
        if (formData.primaryGoals.length === 0) {
          errors.primaryGoals = 'Please select at least one goal';
        }
        break;

      case 4:
        if (!formData.preferredStartDate) errors.preferredStartDate = 'Start date is required';
        if (!formData.agreedToTerms) errors.agreedToTerms = 'You must agree to the terms';
        if (!formData.agreedToCoaching) errors.agreedToCoaching = 'You must commit to coaching sessions';
        break;
    }

    return errors;
  }

  async _submitEnrollment() {
    // Final validation
    const errors = this._validateStep(4);
    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    this.setState({ submitting: true, errors: {} });

    try {
      const { supabaseClient } = await import('../supabase-client.js');
      const user = store.getState('user');

      if (!user) {
        throw new Error('You must be logged in to enroll');
      }

      const { formData } = this.state;

      // Call the RPC function to enroll user
      const { data: enrollmentId, error: enrollError } = await supabaseClient
        .rpc('enroll_user_in_pathways', {
          p_user_id: user.id,
          p_start_date: formData.preferredStartDate,
          p_coach_id: null // Will be assigned by admin
        });

      if (enrollError) throw enrollError;

      // Store enrollment metadata
      const { error: metaError } = await supabaseClient
        .from('pathways_enrollments')
        .update({
          notes: JSON.stringify({
            housingStatus: formData.housingStatus,
            employmentStatus: formData.employmentStatus,
            monthlyIncome: formData.monthlyIncome,
            householdSize: formData.householdSize,
            primaryGoals: formData.primaryGoals,
            challenges: formData.challenges,
            supportNeeded: formData.supportNeeded
          })
        })
        .eq('id', enrollmentId);

      if (metaError) console.warn('Could not save enrollment metadata:', metaError);

      // Reload enrollment data
      await store.dispatch('loadEnrollment');

      // Show success notification
      store.dispatch('addNotification', {
        type: 'success',
        message: 'Successfully enrolled in Pathways Home!'
      });

      // Navigate to dashboard
      router.navigate('/dashboard');

    } catch (error) {
      console.error('Enrollment error:', error);
      this.setState({
        submitting: false,
        errors: { submit: error.message }
      });

      store.dispatch('addNotification', {
        type: 'error',
        message: `Enrollment failed: ${error.message}`
      });
    }
  }
}

export default EnrollmentWizard;
