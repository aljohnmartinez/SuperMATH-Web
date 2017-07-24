var path = require('path');
var express = require('express');
var mysql = require('mysql');
var multer = require('multer');
var router = express.Router();
var server_response = {};

var dbclient = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "supermathdb"
});

var storage = multer.diskStorage({
	destination: './public/images/',
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
})

var loginErrorText = "";
var actionResponse = "";
var notifBit = 0;

var upload = multer({ storage: storage });

/* ---------------------------
    MOBILE APPLICATION ROUTES
   --------------------------- */

router.post('/register', function (req, res, next) {
  dbclient.query('SELECT * FROM users WHERE username = \"' + req.body.username + '\";', function(err, rows) {
    if (rows.length == 0) {
      dbclient.query('INSERT INTO users (username, name, password, type, isApproved) VALUES ' + 
        '(\'' + req.body.username + '\',\'' + req.body.name + '\',\'' + req.body.password + '\',\'0\',\'0\');',
        function (err, insertRow) {
        if (err) {
            res.send({"server_response": {
                "code": "reg_false",
                "message": "An error has occurred. Try again later."
              }
            });
        } else {
          res.send({"server_response": {
              "code": "reg_true",
              "message": "Success"
            }
          });
        }
      });
    } else {
      res.send({"server_response": {
          "code": "reg_false",
          "message": "User already exists. Try again."
        }
      });
    }
  });
});

router.post('/login', function (req, res, next) {
  dbclient.query('SELECT * FROM users ' + 'WHERE username = \"' + req.body.username + '\";', function(err, rows) {
    if (rows.length == 1) {
      if (rows[0].password == req.body.password) {
        if (rows[0].isApproved == 1) {
          res.send({"server_response": {
              "code": "login_true",
              "message": "Successful",
              "id": rows[0].id,
              "username": rows[0].username
            }
          });
        } else {
          res.send({"server_response": {
              "code": "login_false",
              "message": "Student registration is not yet approved. Try again later."
            }
          });
        }
      } else {
        res.send({"server_response": {
            "code": "login_false",
            "message": "Password does not match."
          }
        });
      }
    } else {
        res.send({"server_response": {
          "code": "login_false",
          "message": "Username not found."
        }
      });
    }
  });
});

// Gets the scores of the user
router.post('/getScores', function (req, res, next) {
  dbclient.query('SELECT * FROM students WHERE studentId = \'' + req.body.userId + '\';', function (err, rows) {
    dbclient.query('SELECT COUNT(topicId) AS cnt FROM topic', function (err, count) {
      res.send({"server_response": {
          "code": "getScores_true",
          "message": "Successful",
          "count": count[0].cnt,
          "data": rows
        }
      });
    });
  });
});

// Gets the list of topics
router.get('/getTopics', function (req, res, next) {
  dbclient.query('SELECT * FROM topic ORDER BY topicId ASC;', function (err, rows) {
    res.send({"server_response": {
        "code": "getTopic_true",
        "message": "Successful",
        "data": rows
      }
    });
  });
});

// Gets the list of lessons
router.post('/getLessons', function (req, res, next) {
  dbclient.query('SELECT subtopicName FROM subtopic WHERE topicId = ' + req.body.unit + ' ORDER BY subtopicId ASC;', 
    function (err, rows) {
    res.send({"server_response": {
        "code": "getLesson_true",
        "message": "Successful",
        "unit": req.body.unit,
        "title": req.body.lessonTitle,
        "data": rows
      }
    });
  });
});

// Gets the contents of the selected lesson
router.post('/getPage', function (req, res, next) {
  dbclient.query('SELECT * FROM subtopic WHERE subtopicId = \'' + req.body.subtopicId + '\' AND topicId = \'' +
    req.body.topicId + '\';', function (err, rows) {
    res.send({"server_response": {
        "code": "getPage_true",
        "message": "Successful",
        "title": rows[0].subtopicName,
        "text1": rows[0].text1,
        "text2": rows[0].text2,
        "img1filename": rows[0].img1filename,
        "img2filename": rows[0].img2filename
      }
    });
  });
});

// Gets the test items
router.post('/getTestItems', function (req, res, next) {
  dbclient.query('SELECT * FROM test WHERE topicId = \'' + req.body.topicId + '\';', function (err, rows) {
    res.send({"server_response": {
        "code": "getTestItems_true",
        "message": "Successful",
        "topicId": req.body.topicId,
        "type": req.body.type,
        "data": rows
      }
    });
  });
});

// Gets the test items
router.post('/post_score', function (req, res, next) {
  dbclient.query('UPDATE students SET ' + req.body.colname + '=\'' + req.body.score + '\' WHERE studentId = \'' + req.body.id
    + '\';', function (err, rows) {
    dbclient.query('SELECT topicName FROM topic WHERE topicId=' + req.body.topicId + ';', function (err, get) {
      res.send({"server_response": {
          "code": "post_score_true",
          "message": "Successful",
          "score": req.body.score,
          "topicTitle": get[0].topicName,
          "typeTitle": req.body.typeTitle
        }
      });
    });
  });
});

/* ------------------------
    WEB APPLICATION ROUTES
   ------------------------ */

// Home page
router.get('/', function (req, res, next) {
	if (req.session.username) {
		res.redirect('/index');
	} else {
		res.render('index', {
			error: loginErrorText,
			classname: 'login'
		});
	}
});

// Form input processing route
router.post('/', function (req, res, next) {
  if (req.body.username !== '' && req.body.password !== '') {
  dbclient.query('SELECT * FROM users WHERE username = \"' + req.body.username + '\";',
  function(err, rows) {
    if (!rows) res.redirect('*');
    else {
      if (rows.length == 1) {
        if (req.body.password == rows[0].password) {
          if (rows[0].type > 0) {
            req.session.username = req.body.username;
            req.session.type = rows[0].type;
            req.session.name = rows[0].name;
            loginErrorText = "";
            res.redirect('/index');
          }
        } else {
					loginErrorText = "Credentials does not match."
          res.redirect('/');
        }
      } else {
      	loginErrorText = "Username and/or password not found. Try again."
				res.redirect('/');
      }
    }
  });
  } else {
		loginErrorText = "Supply the needed information for the following: "
		if (req.body.username === '') loginErrorText += "username, "
		if (req.body.password === '') loginErrorText += "password, "
		loginErrorText = loginErrorText.substring(0, loginErrorText.length - 2);
		res.redirect('/');
  }
});
// Home page after a user (admin/teacher) successfully logged in
router.get('/index', function (req, res, next) {
	if (req.session.username) {
    actionResponse = "";
		if (req.session.type == 1) {
			res.render('index', {
				username: req.session.username,
        name: req.session.name,
				classname: 'adminHome',
				subpage: null
			});
		} else {
			res.render('index', {
				username: req.session.username,
        name: req.session.name,
				classname: 'teacherHome',
				subpage: null
			});
		}
	} else {
	  res.render('index', {
	  	classname: 'login'
	  });
	}
});

// --------------
// ADMIN FEATURES
// --------------

// List of Teachers
router.get('/manageTeachers', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('SELECT * FROM users WHERE type = 2 ORDER BY name ASC;', function (err, rows) {
      res.render('index', {
      	message: actionResponse,
        username: req.session.username,
        name: req.session.name,
        classname: 'adminHome',
        subpage: 'manageTeachers',
        teachers: rows
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Add a Teacher
router.post('/addTeacher', function (req, res, next) {
  if (req.session.username) {
		if (req.body.username !== '' && req.body.name !== '' && req.body.password !== '') {
      if (req.body.password === req.body.rePassword) {
  	    dbclient.query('INSERT INTO users (username, name, password, type, isApproved) VALUES ' + 
  	      '(\'' + req.body.username + '\',\'' + req.body.name + '\',\'' + req.body.password +
          '\',\'2\',\'1\')', function (err, rows) {
  				actionResponse = req.body.username + " successfully added."
  	      res.redirect('manageTeachers');
  	    });
      } else {
        actionResponse = "Passwords do not match."
        res.redirect('manageTeachers');
      }
	  } else {
			actionResponse = "Please supply the needed information to add a teacher."
			res.redirect('manageTeachers');
	  }
  } else {
    res.render('index', {
      classname: 'login'
    });
	}
});

// Edit a teacher's attributes
router.post('/editTeacher', function (req, res, next) {
  if (req.session.username) {
		if (req.body.username !== '' && req.body.name !== '' && req.body.password !== '') {
      if (req.body.password === req.body.rePassword) {
        dbclient.query('UPDATE users SET username=\'' + req.body.username + '\', type=\'2\', ' +
          'name=\'' + req.body.name + '\', password=\'' + req.body.password + '\'' +
          'WHERE id = \'' + req.body.id + '\';', function (err, rows) {
          actionResponse = "Teacher information of "+ req.body.name + " was successfully edited."
          res.redirect('manageTeachers');
        });
      } else {
        actionResponse = "Passwords do not match."
        res.redirect('manageTeachers');
      }
	  } else {
			actionResponse = "Supply the needed information for "
			if (req.body.username === '') actionResponse += "username, "
			if (req.body.name === '') actionResponse += "name, "
			if (req.body.password === '') actionResponse += "password, "
			actionResponse = actionResponse.substring(0, actionResponse.length - 2);
			res.redirect('manageTeachers');
	  }
	} else {
    res.render('index', {
      classname: 'login'
    });
	}
});

// Delete a Teacher
router.post('/deleteTeacher', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('DELETE FROM users WHERE id = ' + req.body.id + ';', function (err, rows) {
			actionResponse = req.body.name + " was successfully removed from the list."
      res.redirect('manageTeachers');
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// List of Students for Approval
router.get('/approveRegistration', function (req, res, next) {
  if (req.session.username) {
    actionResponse = "";
    dbclient.query('SELECT username, name, id FROM users WHERE isApproved = 0 ORDER BY username ASC;', function (err, rows) {
      res.render('index', {
        username: req.session.username,
        name: req.session.name,
        classname: 'adminHome',
        subpage: 'approveRegistration',
        applicants: rows
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Approve/Disapprove a Student
router.post('/updateStudentRegistration', function (req, res, next) {
  if (req.session.username) {
    if (req.body.submit === 'approve') {
      dbclient.query('UPDATE users SET isApproved=\'1\' WHERE id = \''+ req.body.id + '\';', function (err, rows) {
        dbclient.query('INSERT INTO students (studentId) VALUES (\''+ req.body.id + '\');', function (err, approve) {
          actionResponse = "Student's registration has been approved.";
          res.redirect('approveRegistration');
        });
      });
    } else {
      dbclient.query('DELETE FROM users WHERE id = \'' + req.body.id + '\';', function (err, rows) {
        actionResponse = "Student's registration has been deleted in the roster.";
        res.redirect('approveRegistration');
      });
    }
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// ----------------
// TEACHER FEATURES
// ----------------

// List of Lessons
router.get('/manageLessons', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('SELECT * FROM topic ORDER BY topicId ASC;', function (err, rows) {
      if (notifBit == 1) actionResponse = "";
      res.render('index', {
        message: actionResponse,
        username: req.session.username,
        name: req.session.name,
        classname: 'teacherHome',
        subpage: 'manageLessons',
        topics: rows
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Add New Unit
router.post('/addTopic', function (req, res, next) {
  if (req.session.username) {
      dbclient.query('INSERT INTO topic (topicId, topicName) VALUES (\'' + req.body.number + '\',\'' +
        req.body.title + '\');', function (err, rows) {
        dbclient.query('INSERT INTO test (topicId) VALUES (' + req.body.number + '), (' + req.body.number + '), (' +
          req.body.number + '), (' + req.body.number + '), (' + req.body.number + '), (' + req.body.number + '), (' +
          req.body.number + '), (' + req.body.number + '), (' + req.body.number + '), (' + req.body.number + ');', function (err, rows) {
          actionResponse = "The unit " + req.body.title + " was successfully added.";
          notifBit = 0;

          var colnamePre = "topic" + req.body.number + "_pre";
          var colnamePost = "topic" + req.body.number + "_post";
          dbclient.query('ALTER TABLE students ADD' + colnamePre + ' INT(3);');
          dbclient.query('ALTER TABLE students ADD' + colnamePost + ' INT(3);');
          res.redirect('manageLessons');
        });
      });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Edit Lesson
router.post('/editLessons', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('SELECT * FROM subtopic WHERE topicId = \'' + req.body.unit + '\' ORDER BY subtopicId ASC;',
    	function (err, rows) {
	    actionResponse = "";
      res.render('index', {
        username: req.session.username,
        name: req.session.name,
        classname: 'teacherHome',
        subpage: 'editLessons',
        unit: req.body.unit,
        title: req.body.title,
        pages: rows
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Edit Test Items
router.post('/editTestItems', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('SELECT * FROM test WHERE topicId = \'' + req.body.unit + '\';', function (err, rows) {
			actionResponse = "";
      res.render('index', {
        username: req.session.username,
        name: req.session.name,
        classname: 'teacherHome',
        subpage: 'editTestItems',
        unit: req.body.unit,
        title: req.body.title,
        items: rows
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Add a Lesson to a Topic
router.post('/addPage', [ upload.any(), function (req, res, next) {
  if (addPageQueries (req) == true) {
    res.redirect('manageLessons');
  }
}]);

function addPageQueries (req) {
  dbclient.query('SELECT MAX(subtopicId) AS newId FROM subtopic WHERE topicId=' + req.body.unit + ';', function (err, res) {
    var SQLQuery1 = 'INSERT INTO subtopic (subtopicName, topicId, subtopicId, text1, text2';
    var SQLQuery2 = ') VALUES (\'' + req.body.title + '\',\'' + req.body.unit + '\',\'' + (res[0].newId + 1) +
       '\',\'' + req.body.text1 + '\',\'' + req.body.text2 + '\'';
    if (req.files[0] !== undefined) {
     SQLQuery1 += ', img1filename';
     SQLQuery2 += ',\'' + req.files[0].originalname + '\'';
    }
    if (req.files[1] !== undefined) {
     SQLQuery1 += ', img2filename';
     SQLQuery2 += ',\'' + req.files[1].originalname + '\'';
    }
    dbclient.query(SQLQuery1 + SQLQuery2 + ');', function (err, rows) {
      actionResponse = "The lesson " + req.body.title + " was successfully added.";
      notifBit = 0;
    });
  });
  return true;
}

// Edit a Lesson
router.post('/editPage', [ upload.any(), function (req, res, next) {
	if (req.session.username) {
		dbclient.query('UPDATE subtopic SET subtopicName=\'' + req.body.title + '\', text1=\'' + req.body.text1 + 
		'\', text2=\'' + req.body.text2 + '\' WHERE id = \'' + req.body.id + '\';', function (err, rows) {
			for (var x = 0; x < 2; x++) {
				if (req.files[x] !== undefined) {
					dbclient.query('UPDATE subtopic SET img1filename=\'' + req.files[x].originalname +
						'\' WHERE id = \'' + req.body.id + '\';');
				}
			}
			actionResponse = "The lesson " + req.body.title + " was successfully edited.";
      notifBit = 0;
			res.redirect('manageLessons');
			});
		} else {
			res.render('index', {
			classname: 'login'
		});
	}
}]);

// Delete a Lesson
router.post('/deletePage', function (req, res, next) {
  if (req.session.username) {
      dbclient.query('UPDATE subtopic SET subtopicId = subtopicId-1 WHERE topicId=' + req.body.unit +
         ' AND subtopicId >' + req.body.id + ';', function (err, upd) {
        dbclient.query('DELETE FROM subtopic WHERE id = \'' + req.body.id + '\';', function (err, rows) {
					actionResponse = "The lesson " + req.body.title + " was successfully deleted.";
          notifBit = 0;
          res.redirect('manageLessons');
        });
      });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Edit a teacher's attributes
router.post('/editQuestion', function (req, res, next) {
  if (req.session.username) {
    var SQLquery = 'UPDATE test SET question=\'' + req.body.question + '\', choice1=\'' + req.body.choice1 + '\', ' +
      'choice2=\'' + req.body.choice2 + '\', choice3=\'' + req.body.choice3 + '\', choice4=\'' + req.body.choice4 +
      '\', answer=\''
    switch(req.body.answer){
      case 'A': SQLquery += req.body.choice1;
                break;
      case 'B': SQLquery += req.body.choice2;
                break;
      case 'C': SQLquery += req.body.choice3;
                break;
      case 'D': SQLquery += req.body.choice4;
                break;
    }
    dbclient.query(SQLquery + '\' WHERE id = \'' + req.body.id + '\';', function (err, rows) {
			actionResponse = "A question from Unit " + req.body.unit + " has been successfully edited."
      notifBit = 0;
      res.redirect('manageLessons');
    });
	} else {
    res.render('index', {
      classname: 'login'
    });
	}
});

// List of Students
router.get('/manageStudents', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('SELECT * FROM students, users WHERE id = studentId AND isApproved = 1;', function (err, rows) {
      if (notifBit == 0) actionResponse = "";
      dbclient.query('SELECT COUNT(topicId) AS cnt FROM topic', function (err, count) {
        res.render('index', {
          username: req.session.username,
          name: req.session.name,
          classname: 'teacherHome',
          subpage: 'manageStudents',
          count: count[0].cnt,
          message: actionResponse,
          student: rows
        });
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Delete a Student
router.post('/deleteStudent', function (req, res, next) {
  if (req.session.username) {
    dbclient.query('DELETE FROM users WHERE id = ' + req.body.id + ';', function (err, row) {
      dbclient.query('DELETE FROM students WHERE studentId = ' + req.body.id + ';', function (err, rows) {
        actionResponse = req.body.name + " was successfully removed from the list."
        notifBit = 1;
        res.redirect('manageStudents');
      });
    });
  } else {
    res.render('index', {
      classname: 'login'
    });
  }
});

// Logout route
router.get('/logout', function (req, res, next) {
	req.session.destroy();
	res.redirect('/');
});

module.exports = router;