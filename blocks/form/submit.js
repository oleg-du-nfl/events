import { DEFAULT_THANK_YOU_MESSAGE, getSubmitBaseUrl } from './constant.js';

export function submitSuccess(e, form) {
  const { payload } = e;
  const redirectUrl = form.dataset.redirectUrl || payload?.body?.redirectUrl;
  const thankYouMsg = form.dataset.thankYouMsg || payload?.body?.thankYouMessage;
  if (redirectUrl) {
    window.location.assign(encodeURI(redirectUrl));
  } else {
    let thankYouMessage = form.parentNode.querySelector('.form-message.success-message');
    if (!thankYouMessage) {
      thankYouMessage = document.createElement('div');
      thankYouMessage.className = 'form-message success-message';
    }
    thankYouMessage.innerHTML = thankYouMsg || DEFAULT_THANK_YOU_MESSAGE;
    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: 'smooth' });
    }
    form.reset();
  }
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form) {
  let errorMessage = form.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = 'Some error occured while submitting the form'; // TODO: translation
  form.prepend(errorMessage);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function getFieldValue(fe, payload) {
  if (fe.type === 'radio') {
    return fe.form.elements[fe.name].value;
  } if (fe.type === 'checkbox') {
    if (payload[fe.name]) {
      if (fe.checked) {
        return `${payload[fe.name]},${fe.value}`;
      }
      return payload[fe.name];
    } if (fe.checked) {
      return fe.value;
    }
  } else if (fe.type !== 'file') {
    return fe.value;
  }
  return null;
}

function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((fe) => {
    if (fe.name && !fe.matches('button') && !fe.disabled && fe.tagName !== 'FIELDSET') {
      const value = getFieldValue(fe, payload);
      if (fe.closest('.repeat-wrapper')) {
        payload[fe.name] = payload[fe.name] ? `${payload[fe.name]},${fe.value}` : value;
      } else {
        payload[fe.name] = value;
      }
    }
  });
  return { payload };
}

async function prepareRequest(form) {
  const { payload } = constructPayload(form);
  const headers = {
    'Content-Type': 'application/json',
    // eslint-disable-next-line comma-dangle
    'x-adobe-form-hostname': window?.location?.hostname
  };
  const body = { data: payload };
  let url;
  let baseUrl = getSubmitBaseUrl();
  if (!baseUrl) {
    // eslint-disable-next-line prefer-template
    baseUrl = 'https://forms.adobe.com/adobe/forms/af/submit/';
    url = baseUrl + btoa(`${form.dataset.action}.json`);
  } else {
    url = form.dataset.action;
  }
  return { headers, body, url };
}

async function submitDocBasedForm(form, captcha) {
  try {
    const { headers, body, url } = await prepareRequest(form, captcha);
    let token = null;
    if (captcha) {
      token = await captcha.getToken();
      body.data['g-recaptcha-response'] = token;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      submitSuccess(response, form);
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}
/**
 * Custom form submission handler targeting external REST endpoints
 * @param {Event} e The form submit event
 * @param {Object} form The underlying Form model instance
 * @param {Object} [captcha] Optional captcha token/instance
 */
export async function handleSubmit(e, form, captcha) {
  e.preventDefault();

  // 1. Extract the native HTML form element
  const formElement = e.target;
  
  // 2. Validate form fields natively before processing submission
  if (!formElement.checkValidity()) {
    formElement.reportValidity();
    return;
  }

  // 3. Construct the JSON data payload from form inputs
  const formData = new FormData(formElement);
  const jsonPayload = Object.fromEntries(formData.entries());

  // 4. Inject Google reCAPTCHA token into payload if available
  if (captcha) {
    jsonPayload['g-recaptcha-response'] = captcha;
  }

  try {
    // 5. Read endpoint metadata globally from your published DA.live config sheet
    const targetEndpoint = window.siteConfig?.['forms-submit-url'] 
      || form.action 
      || 'https://yourdomain.com';

    const requestMethod = window.siteConfig?.['forms-submit-method'] || 'POST';

    // 6. Execute the external REST API call
    const response = await fetch(targetEndpoint, {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(jsonPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 7. Route to your success state (e.g., redirect or display message)
    const result = await response.json();
    if (form.thankYouUrl) {
      window.location.href = form.thankYouUrl;
    } else {
      alert('Form submitted successfully!');
      formElement.reset();
    }

  } catch (error) {
    console.error('REST Form Submission Failed:', error);
    alert('There was an issue submitting your form. Please try again.');
  }
}


