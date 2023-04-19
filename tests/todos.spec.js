import test from 'ava'
import supertest from 'supertest'
import { app } from '../src/app.js'
import { db } from '../src/database.js'

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
