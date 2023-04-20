import test from 'ava'
import supertest from 'supertest'
import { app } from '../src/app.js'
import { db, createUser } from '../src/database.js'

test.beforeEach(async () => {
  await db.migrate.latest()
})

test.afterEach(async () => {
  await db.migrate.rollback()
})

test.serial('GET / shows title of the application', async (t) => {
  const response = await supertest(app).get('/')

  t.assert(response.text.includes('<h1>ToDos!</h1>'))
})

test.serial('GET / shows list of todos', async (t) => {
  await db('todos').insert({ title: 'Test todo!!!' })

  const response = await supertest(app).get('/')

  t.assert(response.text.includes('Test todo!!!'))
})

test.serial('POST /new-todo creates new todo', async (t) => {
  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
})

test.serial('POST /update-todo/:id updates todo', async (t) => {
  const [id] = await db('todos').insert({ title: 'Test todo!!!' })

  const firstResponse = await supertest(app).get(`/detail-todo/${id}`)

  t.assert(firstResponse.text.includes('Test todo!!!'))

  const secondResponse = await supertest(app)
    .post(`/update-todo/${id}`)
    .type('form')
    .send({ title: 'New title!!!' })
    .redirects(1)

  t.assert(!secondResponse.text.includes('Test todo!!!'))
  t.assert(secondResponse.text.includes('New title!!!'))
})

test.serial('GET /toggle-todo/:id toggles todo on index', async (t) => {
  const [id] = await db('todos').insert({ title: 'Test todo!!!' })

  const firstResponse = await supertest(app).get('/')

  t.assert(firstResponse.text.includes('Nesplněno'))
  t.assert(!firstResponse.text.includes('Hotovo'))

  const secondResponse = await supertest(app).get(`/toggle-todo/${id}`).set('Referer', '/').redirects(1)

  t.assert(secondResponse.text.includes('Hotovo'))
  t.assert(!secondResponse.text.includes('Nesplněno'))
})

test.serial('GET /toggle-todo/:id toggles todo on detail', async (t) => {
  const [id] = await db('todos').insert({ title: 'Test todo!!!' })

  const firstResponse = await supertest(app).get(`/detail-todo/${id}`)

  t.assert(firstResponse.text.includes('Nesplněno'))
  t.assert(!firstResponse.text.includes('Hotovo'))

  const secondResponse = await supertest(app)
    .get(`/toggle-todo/${id}`)
    .set('Referer', `/detail-todo/${id}`)
    .redirects(1)

  t.assert(secondResponse.text.includes('Hotovo'))
  t.assert(!secondResponse.text.includes('Nesplněno'))
})

test.serial('GET /remove-todo/:id deletes todo', async (t) => {
  const [id] = await db('todos').insert({ title: 'Test todo!!!' })

  const firstResponse = await supertest(app).get('/')

  t.assert(firstResponse.text.includes('Test todo!!!'))

  const secondResponse = await supertest(app).get(`/remove-todo/${id}`).set('Referer', '/').redirects(1)

  t.assert(!secondResponse.text.includes('Test todo!!!'))
})

test.serial('POST /new-todo shows error message for empty title', async (t) => {
  const response = await supertest(app).post('/new-todo').type('form').send({ title: '' })

  t.assert(response.text.includes('Zadejte název todočka!'))
})

test.serial('POST /new-todo shows error message for title with multiple spaces', async (t) => {
  const response = await supertest(app).post('/new-todo').type('form').send({ title: '   ' })

  t.assert(response.text.includes('Zadejte název todočka!'))
})

test.serial('GET / lists only anonymously created todos', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })
  await db('todos').insert({ title: 'Test todo from form'  })

    const response = await supertest(app)
    .get('/')
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
  t.assert(!response.text.includes('Private todo!!!'))
})

test.serial('POST /new-todo creates and lists only public todos', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })

  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
  t.assert(!response.text.includes('Private todo!!!'))
})

test.serial('POST /update-todo/:id updates publicly created todo', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })
  const todo = await db('todos').insert({ title: 'Test todo from form'  })

  const response = await supertest(app)
    .post(`/update-todo/${todo[0]}`)
    .type('form')
    .send({ title: 'Updated title' })
    .redirects(1)

  t.assert(response.text.includes('Updated title'))
  t.assert(!response.text.includes('Test todo from form'))
  t.assert(!response.text.includes('Private todo!!!'))
})


test.serial('GET / returns list of todos created by signed in user', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })
  await db('todos').insert({ title:'Second private todo!!!', userId: id  })
  await db('todos').insert({ title: 'Test todo from form'  })

  const agent = supertest.agent(app)
  await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  const response = await agent
    .get(`/`)
    .redirects(1)

    t.assert(response.text.includes('Private todo!!!'))
    t.assert(response.text.includes('Second private todo!!!'))
    t.assert(!response.text.includes('Test todo from form'))
})

test.serial('GET /detail-todo/:id id by provided id created by signed in user', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })
  const todoId = await db('todos').insert({ title:'Second private todo!!!', userId: id  })
  await db('todos').insert({ title: 'Test todo from form'  })

  const agent = supertest.agent(app)
  await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  const response = await agent
    .get(`/detail-todo/${todoId}`)
    .redirects(1)

    t.assert(response.text.includes('Second private todo!!!'))
    t.assert(!response.text.includes('Private todo!!!'))
    t.assert(!response.text.includes('Test todo from form'))
})

test.serial('POST /update-todo/:id updates private todo created by signed in user', async (t) => {
  const {id} = await createUser('kuba', 'password')
  await db('todos').insert({ title: 'Private todo!!!', userId: id  })
  const todoId = await db('todos').insert({ title:'Second private todo!!!', userId: id  })
  await db('todos').insert({ title: 'Test todo from form'  })

  const agent = supertest.agent(app)
  await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  const response = await agent
    .post(`/update-todo/${todoId}`)
    .type('form')
    .send({ title: 'Updated title' })
    .redirects(1)

    t.assert(response.text.includes('Updated title'))
    t.assert(response.text.includes('Private todo!!!'))
    t.assert(!response.text.includes('Second private todo!!!'))
    t.assert(!response.text.includes('Test todo from form'))
})

test.serial('POST /toggle-todo/:id toggles private todo created by signed in user', async (t) => {
  const {id} = await createUser('kuba', 'password')
  const todoId = await db('todos').insert({ title:'Second private todo!!!', userId: id  })

  const agent = supertest.agent(app)
  const notToggledResponse = await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  
  t.assert(notToggledResponse.text.includes('Second private todo!!!'))
  t.assert(notToggledResponse.text.includes('Nesplněno'))
  t.assert(!notToggledResponse.text.includes('Hotovo'))


  const response = await agent
    .get(`/toggle-todo/${todoId}`)
    .redirects(1)

    t.assert(response.text.includes('Second private todo!!!'))
    t.assert(response.text.includes('Hotovo'))
    t.assert(!response.text.includes('Nesplněno'))
})

test.serial('POST /remove-todo/:id deletes private todo created by signed in user', async (t) => {
  const {id} = await createUser('kuba', 'password')
  const todoId = await db('todos').insert({ title:'Second private todo!!!', userId: id  })

  const agent = supertest.agent(app)
  const notToggledResponse = await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)
  
  t.assert(notToggledResponse.text.includes('Second private todo!!!'))

  const response = await agent
    .get(`/remove-todo/${todoId}`)
    .redirects(1)

    t.assert(!response.text.includes('Second private todo!!!'))
})

test.serial('POST /new-todo/ creates private todo created by signed in user', async (t) => {
  await createUser('kuba', 'password')

  const agent = supertest.agent(app)
  await agent.post('/login').type('form').send({ username: 'kuba', password: 'password' }).redirects(1)

  const response = await agent
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

    t.assert(response.text.includes('Test todo from form'))
})

