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

test.serial('POST /update-todo/:id correctly updated todo', async (t) => {
  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
  t.assert(response.text.includes('Nesplněno'))

  // get id of created todo and check if is present
  const id = findAllIds(response.text)[0];
  t.assert(!isNaN(id))

  const detailResponse = await supertest(app).get(`/detail-todo/${id}`).redirects(1)

  t.assert(detailResponse.text.includes('Test todo from form'))

  const updatedResponse = await supertest(app).post(`/update-todo/${id}`).type('form').send({ title: 'Updated todo title' }).redirects(1)
  t.assert(updatedResponse.text.includes('Updated todo title'))
  
})

test.serial('GET /toggle-todo/:id correctly set done property in list', async (t) => {
  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
  t.assert(response.text.includes('Nesplněno'))

  // get id of created todo and check if is present
  const id = findAllIds(response.text)[0];
  t.assert(!isNaN(id))

  // toggle status of the todo
  const toggledResponse = await supertest(app)
  .get(`/toggle-todo/${id}`).redirects(1)

  // check status of toggled response
  t.assert(toggledResponse.text.includes('Test todo from form'))
  t.assert(toggledResponse.text.includes('Hotovo'))
  
})

test.serial('GET /toggle-todo/:id correctly toggled one todo in list', async (t) => {
  const todo1 = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)
  const todo2 = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo2 from form' })
    .redirects(1)

  t.assert(todo2.text.includes('Test todo from form'))
  t.assert(todo2.text.includes('Nesplněno'))

  const ids = findAllIds(todo2.text)
  t.assert(ids.every(id => !isNaN(id)))

  // toggle status of the todo
  const toggledResponse = await supertest(app)
  .get(`/toggle-todo/${ids[0]}`).redirects(1)

  // now should response contains both status because only one is toggled
  t.assert(toggledResponse.text.includes('Test todo from form'))
  t.assert(toggledResponse.text.includes('Hotovo'))
  t.assert(toggledResponse.text.includes('Nesplněno'))
  
})

test.serial('GET /toggle-todo/:id correctly set done property in detail', async (t) => {
  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  // get id of created todo and check if is present
  const id = findAllIds(response.text)[0];
  t.assert(!isNaN(id))

  const detailResponse = await supertest(app).get(`/detail-todo/${id[0]}`).redirects(1)

  t.assert(detailResponse.text.includes('Test todo from form'))
  t.assert(detailResponse.text.includes('Nesplněno'))

    // toggle status of the todo
    const toggledResponse = await supertest(app)
    .get(`/toggle-todo/${id}`).redirects(1)


  // now should response contains both status because only one is toggled
  t.assert(toggledResponse.text.includes('Test todo from form'))
  t.assert(toggledResponse.text.includes('Hotovo'))
})

const findAllIds = (text) => {
  const pattern = /\/detail-todo\/(.*?)(?=")/g;
  const matches = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
      matches.push(match[1]);
  }
  return matches
}