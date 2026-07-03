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
export async function handleSubmit(e, form, captcha) {
  e.preventDefault();

  const formElement = e.target;
  
  if (!formElement.checkValidity()) {
    formElement.reportValidity();
    return;
  }

  // Set the form state to loading/submitting to update UI styling
  formElement.classList.add('form-submitting');
  formElement.classList.remove('form-submission-error');

  const formData = new FormData(formElement);
  const jsonPayload = Object.fromEntries(formData.entries());

  if (captcha) {
    jsonPayload['g-recaptcha-response'] = captcha;
  }

  try {
    let targetEndpoint = 'https://yourdomain.com'; // <-- SET YOUR DEFAULT API FALLBACK URL HERE
    let requestMethod = 'POST';

    // Fetch the live configuration JSON from your DA.live sheet path dynamically
    try {
      const configResponse = await fetch('/config.json');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const rows = configData.data || [];
        const urlRow = rows.find(row => row.Key === 'forms-submit-url' || row.key === 'forms-submit-url');
        const methodRow = rows.find(row => row.Key === 'forms-submit-method' || row.key === 'forms-submit-method');
        
        if (urlRow && urlRow.Value) targetEndpoint = urlRow.Value;
        if (methodRow && methodRow.Value) requestMethod = methodRow.Value;
      }
    } catch (configError) {
      console.warn('Could not load config.json dynamically, using fallback endpoint.', configError);
    }

    // Safety check: Prevent submitting back to the static AEM page URL
    if (targetEndpoint.includes(window.location.hostname) && !targetEndpoint.endsWith('.json')) {
      throw new Error(`Invalid submission URL: ${targetEndpoint}. Cannot POST directly to a static page route.`);
    }

    // Execute the external REST API call
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

    formElement.classList.remove('form-submitting');
    formElement.classList.add('form-submission-success');

    if (form.thankYouUrl) {
      window.location.href = form.thankYouUrl;
    } else {
      formElement.reset();
      // Look for the default boilerplate success message element and display it
      const successMessage = formElement.querySelector('.form-message.success') || formElement.parentNode.querySelector('.form-success-message');
      if (successMessage) successMessage.style.display = 'block';
    }

  } catch (error) {
    console.error('REST Form Submission Failed:', error);
    
    // Reset state and apply boilerplate validation error state
    formElement.classList.remove('form-submitting');
    formElement.classList.add('form-submission-error');

    // Dynamically locate or inject an inline page error message if your block markup uses it
    let errorMessage = formElement.querySelector('.form-message.error') || formElement.parentNode.querySelector('.form-error-message');
    
    if (!errorMessage) {
      // Create an inline text container if one didn't exist in the DOM
      errorMessage = document.createElement('div');
      errorMessage.className = 'form-message error form-error-message';
      errorMessage.style.color = 'var(--error-color, #ff0000)';
      errorMessage.style.marginTop = '15px';
      formElement.appendChild(errorMessage);
    }
    
    errorMessage.textContent = 'There was an issue submitting your form. Please try again.';
    errorMessage.style.display = 'block';
  }
}

