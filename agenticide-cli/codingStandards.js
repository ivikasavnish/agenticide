// Coding Styles - Standards from major tech companies
const CODING_STYLES = {
    google: {
        name: 'Google Style Guide',
        languages: ['go', 'cpp', 'python', 'java', 'javascript'],
        features: {
            indentation: 'spaces',
            indentSize: 2,
            lineLength: 80,
            naming: {
                functions: 'MixedCase (Go), camelCase (others)',
                constants: 'UPPER_SNAKE_CASE',
                variables: 'camelCase or snake_case'
            },
            comments: 'Required for all public APIs',
            documentation: 'Comprehensive with examples',
            errorHandling: 'Explicit, never ignore errors',
            testing: 'Table-driven tests preferred'
        },
        guidelines: {
            go: 'https://google.github.io/styleguide/go/',
            python: 'https://google.github.io/styleguide/pyguide.html',
            java: 'https://google.github.io/styleguide/javaguide.html'
        }
    },
    airbnb: {
        name: 'Airbnb JavaScript Style Guide',
        languages: ['javascript', 'typescript', 'react'],
        features: {
            indentation: 'spaces',
            indentSize: 2,
            lineLength: 100,
            naming: {
                functions: 'camelCase',
                constants: 'UPPER_SNAKE_CASE',
                variables: 'camelCase',
                components: 'PascalCase'
            },
            comments: 'Use JSDoc for functions',
            documentation: 'Self-documenting code preferred',
            errorHandling: 'Promises and async/await',
            testing: 'Jest with describe/it blocks'
        },
        guidelines: {
            javascript: 'https://github.com/airbnb/javascript',
            react: 'https://github.com/airbnb/javascript/tree/master/react'
        }
    },
    uber: {
        name: 'Uber Go Style Guide',
        languages: ['go'],
        features: {
            indentation: 'tabs',
            lineLength: 99,
            naming: {
                functions: 'MixedCase',
                constants: 'MixedCase',
                variables: 'camelCase or MixedCase'
            },
            comments: 'Focus on why, not what',
            documentation: 'Package-level and exported items',
            errorHandling: 'Wrap errors with context',
            testing: 'Use testify/assert, table tests'
        },
        guidelines: {
            go: 'https://github.com/uber-go/guide/blob/master/style.md'
        }
    },
    microsoft: {
        name: 'Microsoft Coding Conventions',
        languages: ['csharp', 'typescript'],
        features: {
            indentation: 'spaces',
            indentSize: 4,
            lineLength: 120,
            naming: {
                functions: 'PascalCase',
                constants: 'PascalCase',
                variables: 'camelCase',
                private: '_camelCase'
            },
            comments: 'XML documentation comments',
            documentation: 'IntelliSense-friendly',
            errorHandling: 'Exceptions with meaningful messages',
            testing: 'xUnit with Arrange-Act-Assert'
        },
        guidelines: {
            csharp: 'https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions',
            typescript: 'https://github.com/microsoft/TypeScript/wiki/Coding-guidelines'
        }
    },
    rust: {
        name: 'Rust API Guidelines',
        languages: ['rust'],
        features: {
            indentation: 'spaces',
            indentSize: 4,
            lineLength: 100,
            naming: {
                functions: 'snake_case',
                constants: 'SCREAMING_SNAKE_CASE',
                types: 'PascalCase'
            },
            comments: '/// for doc comments',
            documentation: 'Required with examples',
            errorHandling: 'Result<T, E> pattern',
            testing: '#[test] with descriptive names'
        },
        guidelines: {
            rust: 'https://rust-lang.github.io/api-guidelines/'
        }
    },
    pep8: {
        name: 'PEP 8 - Python Style Guide',
        languages: ['python'],
        features: {
            indentation: 'spaces',
            indentSize: 4,
            lineLength: 79,
            naming: {
                functions: 'snake_case',
                constants: 'UPPER_SNAKE_CASE',
                classes: 'PascalCase'
            },
            comments: 'Docstrings for all public APIs',
            documentation: 'Google or NumPy style docstrings',
            errorHandling: 'Exceptions, not error codes',
            testing: 'pytest with fixtures'
        },
        guidelines: {
            python: 'https://www.python.org/dev/peps/pep-0008/'
        }
    }
};

// API Annotation Standards
const API_ANNOTATIONS = {
    go: {
        markers: {
            api: '// @api',
            route: '// @route',
            method: '// @method',
            auth: '// @auth',
            param: '// @param',
            return: '// @return',
            error: '// @error',
            example: '// @example',
            deprecated: '// @deprecated'
        },
        example: `// @api CreateUser
// @route POST /api/v1/users
// @auth required bearer
// @param name string "User's full name" required
// @param email string "User's email" required
// @return User "Created user object"
// @error 400 "Invalid input"
// @error 401 "Unauthorized"
// @error 500 "Internal server error"
// @example
//   req := CreateUserRequest{Name: "John Doe", Email: "john@example.com"}
//   user, err := service.CreateUser(ctx, req)`
    },
    typescript: {
        markers: {
            api: '@api',
            route: '@route',
            method: '@method',
            auth: '@auth',
            param: '@param',
            returns: '@returns',
            throws: '@throws',
            example: '@example',
            deprecated: '@deprecated'
        },
        example: `/**
 * @api CreateUser
 * @route POST /api/v1/users
 * @auth Bearer token required
 * @param {CreateUserRequest} req - User creation request
 * @returns {Promise<User>} Created user object
 * @throws {ValidationError} Invalid input
 * @throws {UnauthorizedError} Missing or invalid token
 * @example
 * const user = await service.createUser({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 */`
    },
    python: {
        markers: {
            api: '@api',
            route: '@route',
            method: '@method',
            auth: '@auth',
            param: ':param',
            type: ':type',
            returns: ':returns',
            rtype: ':rtype',
            raises: ':raises',
            example: '.. code-block::'
        },
        example: `"""Create a new user.

@api CreateUser
@route POST /api/v1/users
@auth Bearer token required

:param req: User creation request
:type req: CreateUserRequest
:returns: Created user object
:rtype: User
:raises ValueError: Invalid input
:raises UnauthorizedError: Missing or invalid token

Example:
    .. code-block:: python

        user = service.create_user(
            CreateUserRequest(name="John Doe", email="john@example.com")
        )
"""`
    },
    rust: {
        markers: {
            api: '/// @api',
            route: '/// @route',
            method: '/// @method',
            auth: '/// @auth',
            param: '/// # Arguments',
            returns: '/// # Returns',
            errors: '/// # Errors',
            example: '/// # Examples'
        },
        example: `/// @api CreateUser
/// @route POST /api/v1/users
/// @auth Bearer token required
///
/// Creates a new user in the system.
///
/// # Arguments
///
/// * \`req\` - User creation request containing name and email
///
/// # Returns
///
/// * \`Ok(User)\` - Created user object
/// * \`Err(ValidationError)\` - Invalid input
/// * \`Err(UnauthorizedError)\` - Missing or invalid token
///
/// # Examples
///
/// \`\`\`
/// let user = service.create_user(CreateUserRequest {
///     name: "John Doe".to_string(),
///     email: "john@example.com".to_string(),
/// }).await?;
/// \`\`\``
    }
};

// Test Case Templates
const TEST_TEMPLATES = {
    google: {
        name: 'Google Test Style',
        languages: ['go', 'cpp', 'java'],
        patterns: {
            naming: 'Test<Function>_<Scenario>',
            structure: 'Table-driven tests',
            assertions: 'Explicit comparisons',
            comments: 'Minimal, self-explanatory'
        },
        go_example: `func TestCreateUser_Success(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserRequest
        want    *User
        wantErr bool
    }{
        {
            name:    "valid user",
            input:   CreateUserRequest{Name: "John", Email: "john@example.com"},
            want:    &User{Name: "John", Email: "john@example.com"},
            wantErr: false,
        },
        {
            name:    "empty name",
            input:   CreateUserRequest{Name: "", Email: "john@example.com"},
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
}`
    },
    jest: {
        name: 'Jest/Airbnb Style',
        languages: ['javascript', 'typescript'],
        patterns: {
            naming: 'describe/it with natural language',
            structure: 'Arrange-Act-Assert',
            assertions: 'expect with matchers',
            comments: 'Describe intent, not implementation'
        },
        example: `describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', async () => {
      // Arrange
      const mockRepo = createMockRepository();
      const service = new UserService(mockRepo);
      const request = { name: 'John Doe', email: 'john@example.com' };

      // Act
      const user = await service.createUser(request);

      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(mockRepo.insert).toHaveBeenCalledWith(expect.objectContaining(request));
    });

    it('should throw ValidationError for empty name', async () => {
      // Arrange
      const service = new UserService(mockRepo);
      const request = { name: '', email: 'john@example.com' };

      // Act & Assert
      await expect(service.createUser(request)).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError when auth fails', async () => {
      // Arrange
      const service = new UserService(mockRepo);
      mockRepo.insert.mockRejectedValue(new UnauthorizedError());

      // Act & Assert
      await expect(service.createUser(validRequest)).rejects.toThrow(UnauthorizedError);
    });
  });
});`
    },
    pytest: {
        name: 'pytest Style',
        languages: ['python'],
        patterns: {
            naming: 'test_<function>_<scenario>',
            structure: 'Arrange-Act-Assert with fixtures',
            assertions: 'assert with clear messages',
            comments: 'Docstrings for complex scenarios'
        },
        example: `class TestUserService:
    """Tests for UserService."""

    @pytest.fixture
    def service(self, mock_repo):
        """Create a UserService instance with mock repository."""
        return UserService(mock_repo)

    def test_create_user_success(self, service):
        """Test successful user creation."""
        # Arrange
        request = CreateUserRequest(name="John Doe", email="john@example.com")

        # Act
        user = service.create_user(request)

        # Assert
        assert user is not None
        assert user.name == "John Doe"
        assert user.email == "john@example.com"

    def test_create_user_empty_name(self, service):
        """Test that empty name raises ValidationError."""
        # Arrange
        request = CreateUserRequest(name="", email="john@example.com")

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            service.create_user(request)
        assert "name" in str(exc_info.value).lower()

    @pytest.mark.parametrize("name,email,expected_error", [
        ("", "john@example.com", "name"),
        ("John", "", "email"),
        ("John", "invalid-email", "email"),
    ])
    def test_create_user_validation(self, service, name, email, expected_error):
        """Test various validation scenarios."""
        request = CreateUserRequest(name=name, email=email)
        with pytest.raises(ValidationError) as exc_info:
            service.create_user(request)
        assert expected_error in str(exc_info.value).lower()`
    },
    rust: {
        name: 'Rust Test Style',
        languages: ['rust'],
        patterns: {
            naming: 'test_<function>_<scenario>',
            structure: 'Arrange-Act-Assert',
            assertions: 'assert_eq!, assert!',
            comments: 'Focus on edge cases'
        },
        example: `#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_user_success() {
        // Arrange
        let repo = MockRepository::new();
        let service = Service::new(Box::new(repo));
        let request = CreateUserRequest {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
        };

        // Act
        let result = service.create_user(request);

        // Assert
        assert!(result.is_ok());
        let user = result.unwrap();
        assert_eq!(user.name, "John Doe");
        assert_eq!(user.email, "john@example.com");
    }

    #[test]
    fn test_create_user_empty_name() {
        // Arrange
        let repo = MockRepository::new();
        let service = Service::new(Box::new(repo));
        let request = CreateUserRequest {
            name: String::new(),
            email: "john@example.com".to_string(),
        };

        // Act
        let result = service.create_user(request);

        // Assert
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), Error::Validation(_)));
    }

    #[tokio::test]
    async fn test_create_user_async() {
        // Test async version
        let result = service.create_user_async(request).await;
        assert!(result.is_ok());
    }
}`
    }
};

module.exports = {
    CODING_STYLES,
    API_ANNOTATIONS,
    TEST_TEMPLATES
};
