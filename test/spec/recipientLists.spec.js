let _ , SparkPost, chai, sinon, expect;

before(async () => {
    _ = (await import('lodash')).default;
    SparkPost = (await import('../../lib/sparkpost.js')).SparkPost;
    chai = (await import('chai'));
    sinon = (await import('sinon')).default;
    expect = chai.expect;

    chai.use((await import('sinon-chai')).default);
    chai.use((await import('chai-as-promised')).default);
});

describe('Recipient Lists Library', function() {
  var client, recipientLists, callback;

  beforeEach(async function() {
    client = {
      get: sinon.stub().resolves({}),
      post: sinon.stub().resolves({}),
      put: sinon.stub().resolves({}),
      delete: sinon.stub().resolves({}),
      reject: SparkPost.prototype.reject
    };

    callback = function() {};

    recipientLists = (await import('../../lib/recipientLists.js')).default(client);
  });

  describe('list', function() {

    it('should call client get method with the appropriate uri', function() {
      return recipientLists.list(callback)
        .then(function() {
          expect(client.get.firstCall.args[0].uri).to.equal('recipient-lists');
          expect(client.get.firstCall.args[1]).to.equal(callback);
        });
    });
  });

  describe('get', function() {

    it('should call client get method with the appropriate uri', function() {
      return recipientLists.get('test-id', callback)
        .then(function() {
          expect(client.get.firstCall.args[0].uri).to.equal('recipient-lists/test-id');
          expect(client.get.firstCall.args[1]).to.equal(callback);
        });
    });

    it('should throw an error if id is missing', function() {
      return expect(recipientLists.get()).to.be.rejectedWith('id is required');
    });

    it('should not throw an error if optional 2nd argument is a function (callback)', function() {
      let cb = sinon.stub();

      client.get.yields();

      return recipientLists.get('test-id', cb).then(() => {
        expect(cb.callCount).to.equal(1);
      });
    });

    it('should allow show_recipients to be set in options', function() {
      var options = {
        show_recipients: true
      };

      return recipientLists.get('test-id', options)
        .then(function() {
          expect(client.get.firstCall.args[0].qs).to.deep.equal({show_recipients: true});
        });
    });

  });

  describe('create', function() {

    it('should call client post method with the appropriate uri and payload', function() {
      let testList = {
        id: 'test_list',
        recipients: [
          {
            address: {
              email: 'test@test.com',
              name: 'test'
            }
          }
        ]
      };

      return recipientLists.create(testList, callback)
        .then(function() {
          expect(client.post.firstCall.args[0].uri).to.equal('recipient-lists');
          expect(client.post.firstCall.args[0].json).to.deep.equal(testList);
          expect(client.post.firstCall.args[1]).to.equal(callback);
        });
    });

    it('should throw an error if no recipients are provided', function() {
      return Promise.all([
        expect(recipientLists.create(), 'no recipient list hash at all').to.be.rejectedWith('recipient list is required'),
        expect(recipientLists.create({}), 'no recipients key').to.be.rejectedWith('recipient list is required'),
        expect(recipientLists.create(function() {}), 'recipient list is actually a callback').to.be.rejectedWith('recipient list is required')
      ]);
    });

    it('should allow num_rcpt_errors to be set in options', function() {
      var testList = {
        id: 'test_list',
        recipients: [
          {
            address: {
              email: 'test@test.com',
              name: 'test'
            }
          }
        ],
        num_rcpt_errors: 3
      };

      return recipientLists.create(testList)
        .then(function() {
          expect(client.post.firstCall.args[0].qs).to.deep.equal({num_rcpt_errors: 3});
        });
    });

  });

  describe('update', function() {

    it('should call client put method with the appropriate uri and payload', function() {
      const testList = {
        recipients: [
          {
            address: {
              email: 'test@test.com',
              name: 'test'
            }
          }
        ]
      };
      const testId = 'test-id';

      return recipientLists.update(testId, testList, callback)
        .then(function() {
          expect(client.put.firstCall.args[0].uri).to.equal('recipient-lists/' + testId);
          expect(client.put.firstCall.args[0].json).to.deep.equal(testList);
          expect(client.put.firstCall.args[1]).to.equal(callback);
        });
    });

    it('should throw an error if recipient list is missing', function() {
      return expect(recipientLists.update('test-id')).to.be.rejectedWith('recipient list is required');
    });

    it('should throw an error if id is missing', function() {
      return expect(recipientLists.update()).to.be.rejectedWith('recipient list id is required');
    });

    it('should allow num_rcpt_errors to be set in options', function() {
      var testList = {
        recipients: [
          {
            address: {
              email: 'test@test.com',
              name: 'test'
            }
          }
        ],
        num_rcpt_errors: 3
      };

      return recipientLists.update('test-id', testList)
        .then(function() {
          expect(client.put.firstCall.args[0].qs).to.deep.equal({num_rcpt_errors: 3});
        });
    });

  });

  describe('delete', function() {

    it('should call client delete method with the appropriate uri', function() {
      return recipientLists.delete('test', callback)
        .then(function() {
          expect(client.delete.firstCall.args[0].uri).to.equal('recipient-lists/test');
          expect(client.delete.firstCall.args[1]).to.equal(callback);
        });
    });

    it('should throw an error if id is missing', function() {
      return expect(recipientLists.delete()).to.be.rejectedWith('id is required');
    });

  });

});
