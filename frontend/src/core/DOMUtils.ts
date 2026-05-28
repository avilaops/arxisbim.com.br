/**
 * DOM Utilities - Safe DOM manipulation with guards
 * Prevents "Cannot read properties of null" errors
 */

import { getLogger } from './Logger';

const logger = getLogger();

/**
 * Busca elemento por ID com guard seguro
 */
export function safeGetElementById<T extends HTMLElement = HTMLElement>(
  id: string,
  context: string = 'Unknown'
): T | null {
  const element = document.getElementById(id) as T | null;
  
  if (!element) {
    logger.warn('DOM', `Element not found: #${id}`, { context });
  }
  
  return element;
}

/**
 * Busca elemento por seletor com guard seguro
 */
export function safeQuerySelector<T extends Element = Element>(
  selector: string,
  context: string = 'Unknown'
): T | null {
  const element = document.querySelector(selector) as T | null;
  
  if (!element) {
    logger.warn('DOM', `Element not found: ${selector}`, { context });
  }
  
  return element;
}

/**
 * Busca múltiplos elementos por seletor
 */
export function safeQuerySelectorAll<T extends Element = Element>(
  selector: string,
  context: string = 'Unknown'
): T[] {
  const elements = Array.from(document.querySelectorAll(selector)) as T[];
  
  if (elements.length === 0) {
    logger.debug('DOM', `No elements found: ${selector}`, { context });
  }
  
  return elements;
}

/**
 * Adiciona event listener com guard e cleanup tracking
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): (() => void) | null {
  if (!element) {
    logger.warn('DOM', `Cannot add listener to null element`, { type });
    return null;
  }

  element.addEventListener(type, listener as EventListener, options);

  // Retorna função de cleanup
  return () => {
    element.removeEventListener(type, listener as EventListener, options);
  };
}

/**
 * Define textContent com guard seguro
 */
export function safeSetTextContent(
  element: HTMLElement | null,
  text: string
): void {
  if (element) {
    element.textContent = text;
  }
}

/**
 * Define innerHTML com guard seguro
 */
export function safeSetInnerHTML(
  element: HTMLElement | null,
  html: string
): void {
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Adiciona classe com guard seguro
 */
export function safeAddClass(
  element: HTMLElement | null,
  className: string
): void {
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Remove classe com guard seguro
 */
export function safeRemoveClass(
  element: HTMLElement | null,
  className: string
): void {
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Toggle classe com guard seguro
 */
export function safeToggleClass(
  element: HTMLElement | null,
  className: string
): boolean {
  if (element) {
    return element.classList.toggle(className);
  }
  return false;
}

/**
 * Remove elemento com guard seguro
 */
export function safeRemoveElement(element: HTMLElement | null): void {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Define estilo com guard seguro
 */
export function safeSetStyle(
  element: HTMLElement | null,
  property: keyof CSSStyleDeclaration,
  value: string
): void {
  if (element && element.style) {
    (element.style as any)[property] = value;
  }
}
