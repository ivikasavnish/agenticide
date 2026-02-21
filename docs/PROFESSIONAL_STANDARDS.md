# Professional Standards in Agenticide

## Overview

Agenticide generates code following industry-standard practices from major tech companies:
- **Google** - Style guides for Go, Python, Java
- **Airbnb** - JavaScript/TypeScript/React standards
- **Uber** - Go style guide
- **Microsoft** - C# and TypeScript conventions
- **Rust** - Official API guidelines
- **PEP 8** - Python style guide

## 🎯 Three Pillars

### 1. API Annotations
Document all public APIs with structured annotations.

### 2. Test Cases
Generate comprehensive test suites automatically.

### 3. Coding Style
Follow company-standard style guides.

---

## 📝 API Annotations

### Why Annotations Matter

From Google's API Design Guide:
> "Good API documentation is essential to the success of any API."

Agenticide automatically adds professional annotations:
- **Route information** - HTTP methods and paths
- **Authentication** - Security requirements
- **Parameters** - Types, descriptions, validation
- **Return values** - Success responses
- **Errors** - Error codes and messages
- **Examples** - Usage examples

### Go Example (Google Style)

```go
// @api CreateUser
// @route POST /api/v1/users
// @auth required bearer
// @param name string "User's full name" required
// @param email string "User's email address" required  
// @return User "Successfully created user object"
// @error 400 "Invalid input - name or email missing"
// @error 401 "Unauthorized - missing or invalid token"
// @error 409 "Conflict - email already exists"
// @error 500 "Internal server error"
// @example
//   req := CreateUserRequest{
//       Name:  "John Doe",
//       Email: "john@example.com",
//   }
//   user, err := service.CreateUser(ctx, req)
func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // TODO: Implement CreateUser
    return nil, nil
}
```

**Generated Benefits:**
- ✅ Self-documenting code
- ✅ API documentation auto-generated
- ✅ OpenAPI/Swagger specs
- ✅ Team alignment on contracts

### TypeScript Example (Airbnb Style)

```typescript
/**
 * @api CreateUser
 * @route POST /api/v1/users
 * @auth Bearer token required
 * @param {CreateUserRequest} req - User creation request
 * @returns {Promise<User>} Created user object
 * @throws {ValidationError} Invalid name or email
 * @throws {UnauthorizedError} Missing or invalid authentication
 * @throws {ConflictError} Email already registered
 * @example
 * const user = await service.createUser({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 */
async createUser(req: CreateUserRequest): Promise<User> {
    // TODO: Implement createUser
    throw new Error('createUser not implemented');
}
```

### Python Example (PEP 8 + Google Docstring)

```python
"""Create a new user in the system.

@api CreateUser
@route POST /api/v1/users
@auth Bearer token required

Args:
    req (CreateUserRequest): User creation request containing name and email.

Returns:
    User: The newly created user object with generated ID.

Raises:
    ValueError: If name or email is invalid.
    UnauthorizedError: If authentication fails.
    ConflictError: If email already exists.

Example:
    >>> service = UserService(repository)
    >>> user = service.create_user(
    ...     CreateUserRequest(name="John Doe", email="john@example.com")
    ... )
    >>> print(user.id)
    'user-123'
"""
def create_user(self, req: CreateUserRequest) -> User:
    # TODO: Implement create_user
    raise NotImplementedError("create_user not implemented")
```

### Rust Example (Rust API Guidelines)

```rust
/// @api CreateUser
/// @route POST /api/v1/users
/// @auth Bearer token required
///
/// Creates a new user in the system.
///
/// # Arguments
///
/// * `req` - User creation request containing name and email
///
/// # Returns
///
/// * `Ok(User)` - Successfully created user object
/// * `Err(ValidationError)` - Invalid name or email
/// * `Err(UnauthorizedError)` - Authentication failed
/// * `Err(ConflictError)` - Email already exists
///
/// # Examples
///
/// ```
/// let req = CreateUserRequest {
///     name: "John Doe".to_string(),
///     email: "john@example.com".to_string(),
/// };
/// let user = service.create_user(req).await?;
/// println!("Created user: {}", user.id);
/// ```
pub async fn create_user(&self, req: CreateUserRequest) -> Result<User> {
    // TODO: Implement create_user
    unimplemented!("create_user not yet implemented")
}
```

---

## 🧪 Test Case Generation

### Why Tests Matter

From Google Testing Blog:
> "Write tests. Not too many. Mostly integration."

Agenticide generates:
- **Happy path tests** - Successful execution
- **Edge case tests** - Boundaries, empty input, nil/null
- **Error tests** - Invalid input, authorization failures

### Go Example (Google Test Style - Table-Driven)

```go
func TestCreateUser_Success(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserRequest
        want    *User
        wantErr bool
    }{
        {
            name: "valid user",
            input: CreateUserRequest{
                Name:  "John Doe",
                Email: "john@example.com",
            },
            want: &User{
                Name:  "John Doe",
                Email: "john@example.com",
            },
            wantErr: false,
        },
        {
            name: "empty name",
            input: CreateUserRequest{
                Name:  "",
                Email: "john@example.com",
            },
            want:    nil,
            wantErr: true,
        },
        {
            name: "invalid email",
            input: CreateUserRequest{
                Name:  "John Doe",
                Email: "invalid-email",
            },
            want:    nil,
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := NewService(mockRepo)
            got, err := service.CreateUser(context.Background(), tt.input)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateUser() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("CreateUser() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### TypeScript Example (Jest/Airbnb Style)

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    let service: UserService;
    let mockRepo: jest.Mocked<UserRepository>;

    beforeEach(() => {
      mockRepo = createMockRepository();
      service = new UserService(mockRepo);
    });

    it('should create user with valid input', async () => {
      // Arrange
      const request = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      // Act
      const user = await service.createUser(request);

      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(mockRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining(request)
      );
    });

    it('should throw ValidationError for empty name', async () => {
      // Arrange
      const request = { name: '', email: 'john@example.com' };

      // Act & Assert
      await expect(service.createUser(request))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when email exists', async () => {
      // Arrange
      mockRepo.insert.mockRejectedValue(new ConflictError('Email exists'));

      // Act & Assert
      await expect(service.createUser(validRequest))
        .rejects.toThrow(ConflictError);
    });
  });
});
```

### Python Example (pytest Style)

```python
class TestUserService:
    """Tests for UserService."""

    @pytest.fixture
    def service(self, mock_repo):
        """Create UserService with mock repository."""
        return UserService(mock_repo)

    def test_create_user_success(self, service):
        """Test successful user creation."""
        # Arrange
        request = CreateUserRequest(
            name="John Doe",
            email="john@example.com"
        )

        # Act
        user = service.create_user(request)

        # Assert
        assert user is not None
        assert user.name == "John Doe"
        assert user.email == "john@example.com"

    @pytest.mark.parametrize("name,email,expected_error", [
        ("", "john@example.com", "name"),
        ("John", "", "email"),
        ("John", "invalid-email", "email"),
    ])
    def test_create_user_validation(self, service, name, email, expected_error):
        """Test validation error scenarios."""
        request = CreateUserRequest(name=name, email=email)
        
        with pytest.raises(ValueError) as exc_info:
            service.create_user(request)
        
        assert expected_error in str(exc_info.value).lower()

    def test_create_user_conflict(self, service, mock_repo):
        """Test email conflict error."""
        mock_repo.insert.side_effect = ConflictError("Email exists")
        
        with pytest.raises(ConflictError):
            service.create_user(valid_request)
```

---

## 🎨 Coding Styles

### Available Styles

#### 1. Google Style Guide
**Languages:** Go, Python, Java, C++  
**Best for:** Internal tools, backend services

**Key Features:**
- 2-space indentation
- 80-character line length
- Comprehensive documentation
- Table-driven tests

**Usage:**
```bash
/stub user go service --style=google
```

#### 2. Airbnb JavaScript Style
**Languages:** JavaScript, TypeScript, React  
**Best for:** Frontend applications, Node.js services

**Key Features:**
- 2-space indentation
- 100-character line length
- ESLint enforcement
- Jest testing

**Usage:**
```bash
/stub frontend typescript api --style=airbnb
```

#### 3. Uber Go Style Guide
**Languages:** Go  
**Best for:** High-performance Go services

**Key Features:**
- Tab indentation
- 99-character line length
- Context-aware errors
- testify assertions

**Usage:**
```bash
/stub service go --style=uber
```

#### 4. Microsoft Conventions
**Languages:** C#, TypeScript  
**Best for:** .NET applications, TypeScript projects

**Key Features:**
- 4-space indentation
- PascalCase naming
- XML documentation
- xUnit testing

**Usage:**
```bash
/stub api csharp service --style=microsoft
```

#### 5. Rust API Guidelines
**Languages:** Rust  
**Best for:** Systems programming, CLI tools

**Key Features:**
- snake_case functions
- Comprehensive examples
- Result<T, E> pattern
- #[test] attributes

**Usage:**
```bash
/stub core rust library --style=rust
```

#### 6. PEP 8
**Languages:** Python  
**Best for:** Python applications, data science

**Key Features:**
- 4-space indentation
- 79-character line length
- Docstrings required
- pytest fixtures

**Usage:**
```bash
/stub analytics python service --style=pep8
```

---

## 🚀 Usage Examples

### Basic Stub Generation (with defaults)

```bash
agenticide chat

> /stub user go

# Generates with:
# - Google style (default for Go)
# - API annotations
# - Test cases
```

### Custom Style

```bash
> /stub api typescript service --style=airbnb

# Generates with:
# - Airbnb JavaScript style
# - API annotations  
# - Jest tests
```

### Skip Tests (prototyping)

```bash
> /stub prototype python library --no-tests

# Generates with:
# - PEP 8 style
# - API annotations
# - NO test files
```

### Skip Annotations (internal code)

```bash
> /stub internal go service --no-annotations

# Generates with:
# - Google style
# - NO API annotations
# - Test cases
```

### Full Custom

```bash
> /stub payment go service --style=uber --no-annotations with Stripe integration

# Generates with:
# - Uber Go style
# - NO API annotations
# - Test cases
# - Stripe integration stubs
```

---

## 📊 Comparison: Before vs After

### Without Professional Standards

```go
// Before
func CreateUser(req CreateUserRequest) (*User, error) {
    // TODO
    return nil, nil
}

// No documentation
// No tests
// Inconsistent style
```

### With Professional Standards (Agenticide)

```go
// After - Generated with /stub user go --style=google

// @api CreateUser
// @route POST /api/v1/users
// @auth required bearer
// @param name string "User's full name" required
// @param email string "User's email address" required
// @return User "Successfully created user"
// @error 400 "Invalid input"
// @error 401 "Unauthorized"
// @example
//   user, err := service.CreateUser(ctx, CreateUserRequest{
//       Name: "John", Email: "john@example.com"
//   })
func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // TODO: Implement CreateUser
    return nil, nil
}

// Plus comprehensive tests in user_test.go
```

**Benefits:**
- ✅ Professional documentation
- ✅ API contract clear
- ✅ Tests ready to fill
- ✅ Style consistent
- ✅ Team-ready code

---

## 🎯 Best Practices

### 1. Choose the Right Style

- **Google** - Default choice, widely adopted
- **Airbnb** - Frontend/JavaScript projects
- **Uber** - High-performance Go services
- **Company-specific** - Match your team's standards

### 2. Always Generate Tests

```bash
# ✅ Good
/stub user go

# ❌ Only skip for throwaway prototypes
/stub temp go --no-tests
```

### 3. Use Annotations for Public APIs

```bash
# ✅ Public API - use annotations
/stub api go service

# ✅ Internal service - skip if preferred
/stub internal go service --no-annotations
```

### 4. Review Generated Code

1. Generate stubs
2. Review annotations and tests
3. Adjust if needed
4. Then implement

---

## 📚 References

### Official Style Guides

- [Google Style Guides](https://google.github.io/styleguide/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Uber Go Style Guide](https://github.com/uber-go/guide)
- [Microsoft C# Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [PEP 8](https://www.python.org/dev/peps/pep-0008/)

### API Design Guidelines

- [Google API Design Guide](https://cloud.google.com/apis/design)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [OpenAPI Specification](https://swagger.io/specification/)

### Testing Best Practices

- [Google Testing Blog](https://testing.googleblog.com/)
- [Jest Best Practices](https://jestjs.io/docs/api)
- [pytest Documentation](https://docs.pytest.org/)

---

## 🎉 Summary

Agenticide generates:

1. **API Annotations** - Professional documentation for all public APIs
2. **Test Cases** - Comprehensive test suites (happy path + edge cases + errors)
3. **Coding Style** - Industry-standard styles from major tech companies

**Result:** Production-ready code structure that passes team reviews immediately.

**Commands:**
```bash
/stub <module> <language> [options]

Options:
  --style=<name>         Google, Airbnb, Uber, Microsoft, Rust, PEP8
  --no-tests             Skip test generation
  --no-annotations       Skip API annotations
```

**Next:** [Stub-First Workflow Guide](STUB_FIRST_GUIDE.md)
