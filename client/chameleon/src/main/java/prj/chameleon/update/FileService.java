package prj.chameleon.update;

import java.util.HashMap;
import java.util.Map;

import android.annotation.SuppressLint;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;


@SuppressLint("UseSparseArrays")
public class FileService {
	private DBOpenHelper openHelper;

	public FileService(Context context) {
		super();
		this.openHelper =new DBOpenHelper(context);
	}

	public void save(String path,Map<Integer, Integer> map){
		SQLiteDatabase db=openHelper.getWritableDatabase();
		db.beginTransaction();
		try{
			for(Map.Entry<Integer, Integer> entry:map.entrySet()){
				db.execSQL("insert into filedownloadlog(downloadpath,threadid,downlength) values(?,?,?)",new Object[]{
						path,entry.getKey(),entry.getValue()});
			}
			db.setTransactionSuccessful();
		}finally{
			db.endTransaction();
		}
		db.close();
	}

	public Map<Integer, Integer> getData(String path){
		SQLiteDatabase db=openHelper.getReadableDatabase();
		Map<Integer, Integer> data=new HashMap<Integer, Integer>();
		Cursor cursor=db.rawQuery("select threadid,downlength from filedownloadlog where downloadpath=?", new String[]{path});
		while(cursor.moveToNext()){
			data.put(cursor.getInt(0), cursor.getInt(1));
		}
		cursor.close();
		db.close();
		return data;
	}
	

	public void update(String path,int threadid,int pos){
		SQLiteDatabase db=openHelper.getWritableDatabase();
		db.execSQL("update filedownloadlog set downlength=? where downloadpath=? and threadid=?", new Object[]{pos,path,threadid});
		db.close();
	}
	

	public void delete(String path){
		SQLiteDatabase db=openHelper.getWritableDatabase();
		db.execSQL("delete from filedownloadlog where downloadpath=?",new Object[]{path});
		db.close();
		
	}
}
