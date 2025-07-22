import React, { useState, useEffect } from 'react'
import './styles.css'

interface JwtTokenInputProps {
  token: string
  onTokenChange: (token: string) => void
}

const STORAGE_KEY = 'chia_jwt_token'

function JwtTokenInput({ token, onTokenChange }: JwtTokenInputProps) {
  const [inputValue, setInputValue] = useState(token)
  const [isVisible, setIsVisible] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY)
    if (savedToken && !token) {
      setInputValue(savedToken)
      onTokenChange(savedToken)
    }
  }, [token, onTokenChange])

  // Basic JWT validation
  const validateJwt = (jwtString: string): boolean => {
    if (!jwtString || typeof jwtString !== 'string') return false
    
    const parts = jwtString.split('.')
    if (parts.length !== 3) return false
    
    try {
      // Try to decode the header and payload
      for (let i = 0; i < 2; i++) {
        const decoded = atob(parts[i].replace(/-/g, '+').replace(/_/g, '/'))
        JSON.parse(decoded)
      }
      return true
    } catch {
      return false
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    const trimmedValue = value.trim()
    
    if (trimmedValue === '') {
      setIsValid(null)
      onTokenChange('')
      localStorage.removeItem(STORAGE_KEY)
    } else {
      const valid = validateJwt(trimmedValue)
      setIsValid(valid)
      
      if (valid) {
        onTokenChange(trimmedValue)
        localStorage.setItem(STORAGE_KEY, trimmedValue)
      } else {
        onTokenChange('')
      }
    }
  }

  const clearToken = () => {
    setInputValue('')
    setIsValid(null)
    onTokenChange('')
    localStorage.removeItem(STORAGE_KEY)
  }

  const maskedToken = inputValue.length > 20 
    ? `${inputValue.substring(0, 20)}...${inputValue.substring(inputValue.length - 10)}`
    : inputValue

  return (
    <div className="jwt-token-input">
      <div className="token-header">
        <h2>🔐 JWT Token Configuration</h2>
        <p>Enter your JWT token to authenticate with the Chia Cloud Wallet API</p>
      </div>

      <div className="token-form">
        <div className="form-group">
          <label htmlFor="jwt-token">
            JWT Token
            {isValid === true && <span className="validation-indicator valid">✓ Valid</span>}
            {isValid === false && <span className="validation-indicator invalid">✗ Invalid Format</span>}
          </label>
          
          <div className="token-input-group">
            <input
              id="jwt-token"
              type={isVisible ? 'text' : 'password'}
              className={`form-control ${isValid === false ? 'error' : ''}`}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
            />
            
            <div className="token-actions">
              <button
                type="button"
                className="btn btn-toggle"
                onClick={() => setIsVisible(!isVisible)}
                title={isVisible ? 'Hide token' : 'Show token'}
              >
                {isVisible ? '👁️' : '👁️‍🗨️'}
              </button>
              
              {inputValue && (
                <button
                  type="button"
                  className="btn btn-clear"
                  onClick={clearToken}
                  title="Clear token"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {!isVisible && inputValue && (
            <div className="token-preview">
              <small>Preview: {maskedToken}</small>
            </div>
          )}

          {isValid === false && (
            <div className="error-message">
              Invalid JWT format. Token should have three parts separated by dots.
            </div>
          )}

          {isValid === true && (
            <div className="success-message">
              ✓ Token format is valid. You can now use the examples below.
            </div>
          )}
        </div>

        <div className="token-info">
          <h4>How to get your JWT token:</h4>
          <ol>
            <li>Log in to your Chia Enclave Wallet service</li>
            <li>Navigate to API settings or developer section</li>
            <li>Generate or copy your JWT authentication token</li>
            <li>Paste it in the field above</li>
          </ol>
          
          <div className="security-note">
            <strong>🔒 Security Note:</strong> Your token is stored locally in your browser 
            and only used to make API requests to the Chia service. Never share your token 
            with others.
          </div>
        </div>
      </div>


    </div>
  )
}

export default JwtTokenInput 