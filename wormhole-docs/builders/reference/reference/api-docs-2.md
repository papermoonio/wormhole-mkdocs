---
title: API Reference
description: A reference for the types and interfaces in the Moonbeam XCM SDK that can be used to send XCM transfers between chains within the Polkadot/Kusama ecosystems.
template: api-reference.html
hide:
- toc
---

# API Reference

Welcome to the API Documentation Template page! Here, you'll find the basic structure and guidelines for documenting APIs. This template provides a standardized format for documenting API endpoints, methods, parameters, and responses. Whether you're documenting a RESTful API, GraphQL API, or any other type of API, this template will help you create clear and comprehensive documentation that is easy for developers to understand and use.

As API documentation is typically separate from standard documentation, you can use an integrated table of contents to combine the section and page navigation with the table of contents for each page all under the left navigation menu. For example, the **Authentication**, **User Information**, and **Update Profile** sections on this page would appear on the left navigation menu under **API Reference**.

## Authentication

<div class="grid" markdown>
<div markdown>

`authenticate(user, password)` - Authenticates the user with the provided credentials.

**Parameters**

- `user` ++"string"++ - The username of the user.
- `password` ++"string"++ - The password of the user.

**Returns**

- `boolean` - `true` if authentication succeeds, `false` otherwise.

</div>
<div markdown>

```js title="Example"
const isAuthenticated = authenticate(
  'example_user', 
  'password123'
);
console.log(isAuthenticated);
```

```js title="Response"
true
```

</div>
</div> 

---

## User Information

<div class="grid" markdown>
<div markdown>

`getUserInfo(userId)` - Retrieves information about the user.

**Parameters**

- `userId` ++"string"++ - The unique identifier of the user.

**Returns**

- `object` - An object containing user information such as name, email, and role.

</div>
<div markdown>

```javascript title="Example"
const userInfo = getUserInfo('123456');
console.log(userInfo);
```

```js title="Response"
{
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
}
```

</div>
</div>

---

## Update Profile

<div class="grid" markdown>
<div markdown>

`updateProfile(userId, newData)` - Updates the user's profile with new information.

**Parameters**

- `userId` ++"string"++ - The unique identifier of the user whose profile is to be updated.
- `newData` ++"object"++ - An object containing the new profile information to be updated.

**Returns**

- `boolean` - `true` if the profile was successfully updated, `false` otherwise.

</div>
<div markdown>

```javascript title="Example"
const updated = updateProfile(
  '123456', 
  { name: 'Jane Doe', email: 'jane@example.com' }
);
console.log(updated);
```

```js title="Response"
true
```

</div>
</div>

---
