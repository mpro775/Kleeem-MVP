/**
 * Customer utilities for storing and retrieving customer data
 */

export interface LocalCustomerData {
  name: string;
  phone: string;
  address: string;
}

const CUSTOMER_STORAGE_KEY = 'customer';

/**
 * Save customer data to localStorage
 */
export function saveLocalCustomer(data: LocalCustomerData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save customer data:', error);
  }
}

/**
 * Get customer data from localStorage
 */
export function getLocalCustomer(): LocalCustomerData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load customer data:', error);
    return null;
  }
}

/**
 * Clear customer data from localStorage
 */
export function clearLocalCustomer(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear customer data:', error);
  }
}

