class JsonWebToken
  SECRET_KEY = Rails.application.secret_key_base
  ACCESS_TOKEN_TTL = 2.hours
  REFRESH_TOKEN_TTL = 7.days

  def self.encode(payload, ttl = ACCESS_TOKEN_TTL)
    payload[:exp] = ttl.from_now.to_i
    payload[:iat] = Time.current.to_i
    JWT.encode(payload, SECRET_KEY, "HS256")
  end

  def self.decode(token)
    body = JWT.decode(token, SECRET_KEY, true, algorithm: "HS256")[0]
    HashWithIndifferentAccess.new(body)
  rescue JWT::ExpiredSignature
    raise JWT::ExpiredSignature, "Token has expired"
  rescue JWT::DecodeError
    raise JWT::DecodeError, "Invalid token"
  end

  def self.generate_access_token(user)
    encode({ user_id: user.id, role: user.role })
  end

  def self.generate_refresh_token
    SecureRandom.hex(32)
  end
end
